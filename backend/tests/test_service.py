"""Regras de negócio. Nenhum banco, nenhum HTTP — só as funções puras."""
from datetime import date
from decimal import Decimal

import pytest

from app.domain.service import (
    MAX_NTH_BUSINESS_DAY,
    calculate_category_breakdown,
    calculate_invoice,
    calculate_summaries,
    calculate_summary,
    income_payments,
    invoice_for_purchase,
    is_income_on_credit,
    next_payment,
    payment_date,
    shift_month,
    split_installments,
)


def renda_do_mes(month, incomes):
    """A renda fixa que conta no mês: a soma dos pagamentos que caem nele."""
    return sum((p.amount for p in income_payments(month, incomes)), Decimal(0))


class TestShiftMonth:
    @pytest.mark.parametrize("inicio,n,esperado", [
        ("2026-09", 1, "2026-10"),
        ("2026-12", 1, "2027-01"),   # vira o ano
        ("2026-01", -1, "2025-12"),  # volta o ano
        ("2026-09", 0, "2026-09"),
        ("2026-01", -13, "2024-12"), # mais de um ano para trás
        ("2026-12", 12, "2027-12"),
    ])
    def test_atravessa_a_virada_de_ano(self, inicio, n, esperado):
        assert shift_month(inicio, n) == esperado

    def test_ida_e_volta_sempre_retorna_ao_mesmo_mes(self):
        for n in range(-30, 31):
            assert shift_month(shift_month("2026-06", n), -n) == "2026-06"


class TestIsIncomeOnCredit:
    @pytest.mark.parametrize("tipo,metodo,esperado", [
        ("entrada", "credito", True),   # o único caso proibido
        ("entrada", "avista", False),
        ("gasto", "credito", False),
        ("gasto", "avista", False),
        ("entrada", None, False),       # linha importada não tem método
    ])
    def test_so_entrada_no_credito_e_proibida(self, tipo, metodo, esperado):
        assert is_income_on_credit(tipo, metodo) is esperado


class TestInvoiceForPurchase:
    """docs/dominio.md: antes do fechamento cai na fatura do mês seguinte;
    no dia do fechamento ou depois, pula para a subsequente."""

    @pytest.mark.parametrize("compra,esperado", [
        ("2026-09-05", "2026-10"),  # antes do dia 10
        ("2026-09-09", "2026-10"),  # véspera
        ("2026-09-10", "2026-11"),  # no dia do fechamento -> pula
        ("2026-09-11", "2026-11"),  # depois
    ])
    def test_a_fronteira_e_o_proprio_dia_de_fechamento(self, compra, esperado):
        assert invoice_for_purchase(date.fromisoformat(compra), 10) == esperado

    def test_dezembro_empurra_para_o_ano_seguinte(self):
        assert invoice_for_purchase(date(2026, 12, 5), 10) == "2027-01"
        assert invoice_for_purchase(date(2026, 12, 20), 10) == "2027-02"


class TestSplitInstallments:
    """A razão de existir desta função é não perder centavo."""

    @pytest.mark.parametrize("valor,n", [
        ("100.00", 3), ("0.01", 1), ("0.05", 3), ("1000.00", 7),
        ("3600.00", 9), ("999.99", 48), ("0.02", 3),
    ])
    def test_a_soma_das_parcelas_e_sempre_o_valor_original(self, valor, n):
        parcelas = split_installments(Decimal(valor), n)
        assert sum(parcelas) == Decimal(valor)
        assert len(parcelas) == n

    def test_a_ultima_parcela_absorve_a_sobra(self):
        assert split_installments(Decimal("100.00"), 3) == [
            Decimal("33.33"), Decimal("33.33"), Decimal("33.34")
        ]

    def test_parcela_unica_devolve_o_valor_inteiro(self):
        assert split_installments(Decimal("42.42"), 1) == [Decimal("42.42")]


class TestCalculateInvoice:
    def test_mes_sem_parcela_devolve_total_zero_e_lista_vazia(self, user):
        fatura = calculate_invoice("2030-01", [], user.closing_day)
        assert fatura.total == Decimal(0)
        assert fatura.items == []

    def test_compra_parcelada_aparece_em_meses_consecutivos(self, user, gasto):
        tv = gasto("2026-09-05", "300.00", method="credito", installments=3, description="TV")
        meses = [calculate_invoice(m, [tv], user.closing_day) for m in ("2026-10", "2026-11", "2026-12")]
        assert [f.total for f in meses] == [Decimal("100.00")] * 3
        assert [f.items[0].installment for f in meses] == [1, 2, 3]
        assert all(f.items[0].total_installments == 3 for f in meses)

    def test_gasto_a_vista_nao_entra_em_fatura(self, user, gasto):
        avista = gasto("2026-09-05", "300.00", method="avista")
        assert calculate_invoice("2026-10", [avista], user.closing_day).total == Decimal(0)


class TestCalculateSummary:
    def test_a_formula_do_saldo_do_mes(self, user, gasto, renda):
        entries = [
            gasto("2026-09-03", "300.00", category="Mercado"),
            gasto("2026-09-10", "900.00", type="entrada", category="Freela"),
            gasto("2026-08-05", "1200.00", method="credito", installments=3, category="Lazer"),
        ]
        s = calculate_summary("2026-09", user, entries, [renda("2026-09", "5000.00")])
        assert s.cash_expenses == Decimal("300.00")
        assert s.extra_income == Decimal("900.00")
        assert s.invoice == Decimal("400.00")
        assert s.total_spent == Decimal("700.00")
        # 5000 + 900 - 300 - 400
        assert s.month_balance == Decimal("5200.00")

    def test_usuario_sem_lancamento_ve_apenas_a_renda(self, user, renda):
        s = calculate_summary("2026-09", user, [], [renda("2026-09", "5000.00")])
        assert s.month_balance == Decimal("5000.00")
        assert s.total_spent == Decimal(0)


class TestPaymentDate:
    """UC4: as datas da pesquisa sobre pagamento de salário (ver o documento da feature)."""

    @pytest.mark.parametrize("ano,mes,esperado", [
        (2026, 10, date(2026, 10, 6)),   # o sábado 3 conta: terça, 6/10
        (2026, 11, date(2026, 11, 6)),   # Finados não conta: sábado 7/11, pago na sexta
        (2026, 12, date(2026, 12, 4)),   # sábado 5/12, pago na sexta
        (2027, 1, date(2027, 1, 7)),     # 1º de janeiro não conta
    ])
    def test_quinto_dia_util_pela_clt(self, ano, mes, esperado):
        assert payment_date("dia_util", 5, ano, mes) == esperado

    def test_ultimo_dia_util(self):
        assert payment_date("ultimo_dia_util", None, 2026, 10) == date(2026, 10, 30)

    def test_ultimo_dia_util_com_o_mes_acabando_no_domingo(self):
        """F5: 31/05/2026 é domingo."""
        assert payment_date("ultimo_dia_util", None, 2026, 5) == date(2026, 5, 29)

    @pytest.mark.parametrize("dia,ano,mes,esperado", [
        (10, 2026, 10, date(2026, 10, 9)),   # sábado vira sexta
        (15, 2026, 11, date(2026, 11, 13)),  # domingo e feriado: sexta
        (31, 2026, 2, date(2026, 2, 27)),    # fevereiro acaba no sábado 28
        (31, 2026, 4, date(2026, 4, 30)),    # mês de 30 dias
        (2, 2026, 11, date(2026, 10, 30)),   # Finados numa segunda: volta para outubro
        (6, 2026, 10, date(2026, 10, 6)),    # dia útil fica como está
    ])
    def test_dia_fixo_antecipa_para_o_dia_com_banco(self, dia, ano, mes, esperado):
        """F3."""
        assert payment_date("dia_fixo", dia, ano, mes) == esperado

    def test_carnaval_e_corpus_christi_nao_tem_banco(self):
        assert payment_date("dia_fixo", 17, 2026, 2) == date(2026, 2, 13)  # terça de Carnaval
        assert payment_date("dia_fixo", 4, 2026, 6) == date(2026, 6, 3)    # Corpus Christi

    def test_carnaval_conta_como_dia_util_na_clt(self):
        """O 13º dia útil de fevereiro/2026 é a segunda de Carnaval (se não contasse, seria o
        dia 18); o banco não abre e o crédito volta para a sexta, 13/02."""
        assert payment_date("dia_util", 13, 2026, 2) == date(2026, 2, 13)

    def test_todo_mes_tem_o_maior_n_aceito(self):
        """F4: o limite do N-ésimo dia útil existe em todo mês do intervalo aceito."""
        for ano in range(1900, 2200):
            for mes in range(1, 13):
                payment_date("dia_util", MAX_NTH_BUSINESS_DAY, ano, mes)


class TestIncomePayments:
    def test_renda_dividida_soma_as_partes(self, renda, parte):
        """UC1/UC2: vale no dia 20 e o resto no 5º dia útil."""
        r = renda("2026-01", parts=[parte("1000.00", "dia_fixo", 20), parte("3000.00", "dia_util", 5)])
        pagamentos = income_payments("2026-11", [r])
        assert [(p.date, p.amount) for p in pagamentos] == [
            (date(2026, 11, 6), Decimal("3000.00")),
            (date(2026, 11, 19), Decimal("1000.00")),  # 20/11 é Consciência Negra
        ]
        assert renda_do_mes("2026-11", [r]) == Decimal("4000.00")

    def test_parte_do_mes_seguinte(self, renda, parte):
        """UC3: o pagamento de 30/10 conta em novembro; outubro não recebe o de setembro, que
        foi antes do início da renda."""
        r = renda("2026-10", parts=[parte("5000.00", "ultimo_dia_util", next_month=True)])
        assert renda_do_mes("2026-10", [r]) == Decimal(0)
        [pagamento] = income_payments("2026-11", [r])
        assert (pagamento.date, pagamento.next_month) == (date(2026, 10, 30), True)

    def test_troca_para_o_proprio_mes_conta_duas_vezes(self, renda, parte):
        """F7: os dois pagamentos acontecem de verdade, e outubro recebe os dois."""
        antiga = renda("2026-01", end="2026-09-30",
                       parts=[parte("5000.00", "ultimo_dia_util", next_month=True)])
        nova = renda("2026-10", parts=[parte("5000.00", "dia_util", 5)])
        assert renda_do_mes("2026-10", [antiga, nova]) == Decimal("10000.00")

    def test_troca_para_o_mes_seguinte_deixa_um_mes_sem_renda(self, renda, parte):
        """F7, ao contrário."""
        antiga = renda("2026-01", end="2026-09-30", parts=[parte("5000.00", "dia_util", 5)])
        nova = renda("2026-10", parts=[parte("5000.00", "ultimo_dia_util", next_month=True)])
        assert renda_do_mes("2026-10", [antiga, nova]) == Decimal(0)
        assert renda_do_mes("2026-11", [antiga, nova]) == Decimal("5000.00")

    def test_fim_para_de_somar(self, renda, parte):
        """UC9: o fim no meio do mês corta só o que cai depois dele."""
        r = renda("2026-01", end="2026-11-10",
                  parts=[parte("1000.00", "dia_fixo", 5), parte("3000.00", "dia_fixo", 20)])
        assert renda_do_mes("2026-11", [r]) == Decimal("1000.00")
        assert renda_do_mes("2026-12", [r]) == Decimal(0)

    def test_rendas_sobrepostas_somam(self, renda, parte):
        """UC11."""
        rendas = [renda("2026-01", "3000.00"), renda("2026-06", "2000.00")]
        assert renda_do_mes("2026-05", rendas) == Decimal("3000.00")
        assert renda_do_mes("2026-06", rendas) == Decimal("5000.00")

    def test_renda_antiga_sem_dia_conta_no_proprio_mes(self, renda):
        """UC10/F8: sem regra, vale o dia 1, que é como a renda funcionava antes."""
        r = renda("2026-08", "1000.00", end="2026-09-30")
        assert [renda_do_mes(m, [r]) for m in ("2026-07", "2026-08", "2026-09", "2026-10")] == [
            Decimal(0), Decimal("1000.00"), Decimal("1000.00"), Decimal(0),
        ]
        [pagamento] = income_payments("2026-08", [r])
        assert pagamento.date is None

    def test_sem_renda_registrada_e_zero(self):
        assert renda_do_mes("2026-09", []) == Decimal(0)


class TestNextPayment:
    def test_proxima_data_a_partir_de_hoje(self, renda, parte):
        r = renda("2026-01")
        p = parte("1000.00", "dia_util", 5)
        assert next_payment(r, p, date(2026, 10, 31)) == date(2026, 11, 6)
        assert next_payment(r, p, date(2026, 11, 6)) == date(2026, 11, 6)  # o próprio dia
        assert next_payment(r, p, date(2026, 11, 7)) == date(2026, 12, 4)

    def test_renda_encerrada_nao_tem_proxima(self, renda, parte):
        r = renda("2026-01", end="2026-10-31")
        assert next_payment(r, parte("1.00", "dia_util", 5), date(2026, 10, 31)) is None

    def test_renda_que_ainda_vai_comecar(self, renda, parte):
        r = renda("2027-03")
        assert next_payment(r, parte("1.00", "dia_fixo", 10), date(2026, 10, 31)) == date(2027, 3, 10)

    def test_parte_sem_regra_nao_tem_data(self, renda, parte):
        assert next_payment(renda("2026-01"), parte("1.00"), date(2026, 10, 31)) is None


class TestSaldoAcumulado:
    def _saldos(self, meses, user, entries, rendas):
        return [s.available_balance for s in calculate_summaries(meses, user, entries, rendas)]

    def test_acumulado_e_o_anterior_mais_o_do_mes(self, user, gasto, renda):
        """UC1."""
        entries = [gasto("2026-08-03", "300.00"), gasto("2026-09-03", "500.00")]
        s = calculate_summary("2026-09", user, entries, [renda("2026-08", "1000.00")])
        assert s.month_balance == Decimal("500.00")
        assert s.available_balance == Decimal("1200.00")  # 700 de agosto + 500

    def test_conta_vazia_acumula_zero(self, user):
        """F1: continua cumulativo; nada soma nada."""
        assert self._saldos(["2026-08", "2026-09"], user, [], []) == [Decimal(0), Decimal(0)]

    def test_meses_antes_de_tudo_somam_zero(self, user, gasto, renda):
        """UC2/F2: antes do primeiro lançamento e da primeira renda o acumulado é zero, e o
        primeiro mês com valores não depende de onde a soma começa."""
        entries = [gasto("2026-09-03", "100.00")]
        rendas = [renda("2026-09", "1000.00")]
        assert self._saldos(["2026-07", "2026-08", "2026-09"], user, entries, rendas) == [
            Decimal(0), Decimal(0), Decimal("900.00"),
        ]

    def test_mes_vazio_no_meio_carrega_o_acumulado(self, user, gasto):
        """UC2: x + 0 = x."""
        entries = [gasto("2026-07-03", "100.00", type="entrada")]
        assert self._saldos(["2026-07", "2026-08", "2026-09"], user, entries, []) == [
            Decimal("100.00"), Decimal("100.00"), Decimal("100.00"),
        ]

    def test_negativo_passa_adiante(self, user, gasto, renda):
        """UC3."""
        entries = [gasto("2026-08-03", "1500.00")]
        assert self._saldos(["2026-08", "2026-09"], user, entries, [renda("2026-08", "1000.00")]) == [
            Decimal("-500.00"), Decimal("500.00"),
        ]

    def test_futuro_soma_renda_e_desconta_parcelas(self, user, gasto, renda):
        """UC4: compra em 05/09 com fechamento dia 10 cai nas faturas de out, nov e dez."""
        entries = [gasto("2026-09-05", "300.00", method="credito", installments=3)]
        saldos = self._saldos(["2026-12"], user, entries, [renda("2026-09", "1000.00")])
        assert saldos == [Decimal("3700.00")]  # 4 rendas - 300 de parcelas

    def test_renda_nova_muda_so_dali_em_diante(self, user, renda):
        """UC5: a antiga termina e a nova começa."""
        rendas = [renda("2026-08", "1000.00", end="2026-09-30"), renda("2026-10", "2000.00")]
        assert self._saldos(["2026-09", "2026-10"], user, [], rendas) == [
            Decimal("2000.00"), Decimal("4000.00"),
        ]

    def test_apagar_renda_nao_estende_a_anterior(self, user, renda):
        """UC6: sem a de outubro, outubro fica sem renda — a de agosto já tinha terminado."""
        assert self._saldos(["2026-10"], user, [], [renda("2026-08", "1000.00", end="2026-09-30")]) == [
            Decimal("2000.00"),
        ]

    def test_lancamento_passado_muda_os_seguintes(self, user, gasto):
        """UC8."""
        antes = self._saldos(["2026-09"], user, [], [])
        depois = self._saldos(["2026-09"], user, [gasto("2026-06-03", "100.00")], [])
        assert (antes, depois) == ([Decimal(0)], [Decimal("-100.00")])

    def test_excluir_o_mais_antigo_tira_a_contribuicao_dele(self, user, gasto, renda):
        """F3."""
        rendas = [renda("2026-09", "1000.00")]
        antigo, novo = gasto("2026-07-03", "200.00"), gasto("2026-09-03", "100.00")
        assert self._saldos(["2026-09"], user, [antigo, novo], rendas) == [Decimal("700.00")]
        assert self._saldos(["2026-09"], user, [novo], rendas) == [Decimal("900.00")]

    def test_extrato_antigo_sem_renda_puxa_para_baixo(self, user, gasto, renda):
        """F4: meses antes da primeira renda contam renda zero."""
        entries = [gasto("2026-05-03", "400.00")]
        assert self._saldos(["2026-09"], user, entries, [renda("2026-09", "1000.00")]) == [
            Decimal("600.00"),
        ]

    def test_renda_encerrada_para_de_somar(self, user, renda):
        """UC9."""
        rendas = [renda("2026-08", "1000.00", end="2026-08-31")]
        assert self._saldos(["2026-10"], user, [], rendas) == [Decimal("1000.00")]

    def test_resumo_traz_os_pagamentos_do_mes(self, user, renda, parte):
        """UC4: o resumo diz de onde veio a renda do mês."""
        r = renda("2026-10", parts=[parte("5000.00", "ultimo_dia_util", next_month=True)])
        s = calculate_summary("2026-11", user, [], [r])
        assert s.monthly_income == Decimal("5000.00")
        assert [(p.date, p.next_month) for p in s.income_payments] == [(date(2026, 10, 30), True)]

    def test_sem_renda_nenhuma_so_os_lancamentos_acumulam(self, user, gasto):
        """F7b."""
        entries = [gasto("2026-08-03", "100.00"), gasto("2026-09-03", "50.00")]
        assert self._saldos(["2026-09"], user, entries, []) == [Decimal("-150.00")]

    def test_totais_do_mes_nao_mudam(self, user, gasto, renda):
        """F12: só o saldo ganha a versão acumulada."""
        entries = [
            gasto("2026-08-03", "999.00"),
            gasto("2026-09-03", "300.00"),
            gasto("2026-08-05", "1200.00", method="credito", installments=3),
        ]
        s = calculate_summary("2026-09", user, entries, [renda("2026-08", "1000.00")])
        assert (s.cash_expenses, s.invoice, s.total_spent) == (
            Decimal("300.00"), Decimal("400.00"), Decimal("700.00"),
        )

    def test_varios_meses_de_uma_vez_batem_com_um_por_vez(self, user, gasto, renda):
        """O /trend pede vários meses numa chamada; cada um precisa dar o mesmo que o /summary."""
        entries = [gasto("2026-06-03", "120.00"), gasto("2026-08-05", "900.00", method="credito",
                                                        installments=3)]
        rendas = [renda("2026-06", "1000.00")]
        meses = ["2026-07", "2026-09", "2026-11"]
        juntos = calculate_summaries(meses, user, entries, rendas)
        assert juntos == [calculate_summary(m, user, entries, rendas) for m in meses]


class TestCategoryBreakdown:
    def test_os_totais_somam_o_total_gasto(self, user, gasto):
        entries = [
            gasto("2026-09-03", "300.00", category="Mercado"),
            gasto("2026-09-04", "80.00", category="Transporte"),
            gasto("2026-08-05", "1200.00", method="credito", installments=3, category="Lazer"),
        ]
        breakdown = calculate_category_breakdown("2026-09", user, entries)
        resumo = calculate_summary("2026-09", user, entries, [])
        assert sum(c.total for c in breakdown) == resumo.total_spent

    def test_vem_ordenado_do_maior_para_o_menor(self, user, gasto):
        entries = [
            gasto("2026-09-03", "80.00", category="Transporte"),
            gasto("2026-09-04", "300.00", category="Mercado"),
        ]
        assert [c.category for c in calculate_category_breakdown("2026-09", user, entries)] == [
            "Mercado", "Transporte"
        ]

    def test_parcela_de_compra_antiga_carrega_o_numero_da_parcela(self, user, gasto):
        tv = gasto("2026-08-05", "1200.00", method="credito", installments=3,
                   category="Lazer", description="TV")
        item = calculate_category_breakdown("2026-09", user, [tv])[0].items[0]
        assert (item.description, item.installment, item.total_installments) == ("TV", 1, 3)

    def test_mes_sem_gasto_nao_devolve_categoria(self, user):
        assert calculate_category_breakdown("2030-01", user, []) == []
