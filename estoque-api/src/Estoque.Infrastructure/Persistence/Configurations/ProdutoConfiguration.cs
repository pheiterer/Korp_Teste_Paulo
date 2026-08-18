using Estoque.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Estoque.Infrastructure.Persistence.Configurations;

public class ProdutoConfiguration : IEntityTypeConfiguration<Produto>
{
    public void Configure(EntityTypeBuilder<Produto> builder)
    {
        builder.ToTable("produtos");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(p => p.Codigo)
            .HasColumnName("codigo")
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(p => p.Codigo)
            .IsUnique();

        builder.Property(p => p.Descricao)
            .HasColumnName("descricao")
            .HasMaxLength(250)
            .IsRequired();

        builder.Property(p => p.Saldo)
            .HasColumnName("saldo")
            .HasDefaultValue(0)
            .IsRequired();
    }
}
