namespace Estoque.Application.Contracts;

public record NotaFiscalEmitidaEvent(
    Guid NotaFiscalId,
    string Numero,
    List<NotaFiscalItemEvent> Itens,
    DateTime DataEmissao
);

public record NotaFiscalItemEvent(
    string CodigoProduto,
    int Quantidade
);

public record AbatimentoEstoqueFalhouEvent(
    Guid NotaFiscalId,
    string Motivo,
    DateTime DataFalha
);
