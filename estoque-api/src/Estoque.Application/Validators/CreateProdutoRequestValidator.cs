using Estoque.Application.DTOs;
using FluentValidation;

namespace Estoque.Application.Validators;

public class CreateProdutoRequestValidator : AbstractValidator<CreateProdutoRequest>
{
    public CreateProdutoRequestValidator()
    {
        RuleFor(x => x.Codigo)
            .NotEmpty().WithMessage("O código do produto não pode ser vazio ou nulo.")
            .MaximumLength(50).WithMessage("O código do produto não pode ter mais de 50 caracteres.");

        RuleFor(x => x.Descricao)
            .NotEmpty().WithMessage("A descrição do produto não pode ser vazia ou nula.")
            .MaximumLength(200).WithMessage("A descrição do produto não pode ter mais de 200 caracteres.");

        RuleFor(x => x.SaldoInicial)
            .GreaterThanOrEqualTo(0).WithMessage("O saldo inicial do produto não pode ser negativo.");
    }
}
