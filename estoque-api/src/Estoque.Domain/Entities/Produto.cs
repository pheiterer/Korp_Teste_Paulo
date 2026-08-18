using Estoque.Domain.Exceptions;

namespace Estoque.Domain.Entities;

public class Produto
{
    public Guid Id { get; private set; }
    public string Codigo { get; private set; } = string.Empty;
    public string Descricao { get; private set; } = string.Empty;
    public int Saldo { get; private set; }

    // Construtor privado para uso do EF Core
    private Produto() { }

    public Produto(string codigo, string descricao, int saldoInicial = 0)
    {
        Id = Guid.NewGuid();
        SetCodigo(codigo);
        SetDescricao(descricao);
        SetSaldo(saldoInicial);
    }

    public void SetCodigo(string codigo)
    {
        if (string.IsNullOrWhiteSpace(codigo))
        {
            throw new DomainException("O código do produto não pode ser vazio ou nulo.");
        }

        Codigo = codigo.Trim().ToUpperInvariant();
    }

    public void SetDescricao(string descricao)
    {
        if (string.IsNullOrWhiteSpace(descricao))
        {
            throw new DomainException("A descrição do produto não pode ser vazia ou nula.");
        }

        Descricao = descricao.Trim();
    }

    public void SetSaldo(int saldo)
    {
        if (saldo < 0)
        {
            throw new DomainException("O saldo inicial do produto não pode ser negativo.");
        }

        Saldo = saldo;
    }

    public void AdicionarSaldo(int quantidade)
    {
        if (quantidade <= 0)
        {
            throw new DomainException("A quantidade a ser adicionada deve ser maior que zero.");
        }

        Saldo += quantidade;
    }

    public void DebitarSaldo(int quantidade)
    {
        if (quantidade <= 0)
        {
            throw new DomainException("A quantidade a ser debitada deve ser maior que zero.");
        }

        if (Saldo < quantidade)
        {
            throw new DomainException($"Saldo insuficiente para débito. Saldo atual: {Saldo}, quantidade solicitada: {quantidade}.");
        }

        Saldo -= quantidade;
    }
}
