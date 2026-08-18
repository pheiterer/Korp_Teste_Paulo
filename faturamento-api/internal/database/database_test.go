package database_test

import (
	"os"
	"testing"

	"faturamento-api/internal/database"

	"github.com/stretchr/testify/assert"
)

func TestConnectDB_InvalidConnectionString(t *testing.T) {
	// Configura string de conexao invalida para validar tratamento de erro explicito
	os.Setenv("ConnectionStrings__SqlServer", "sqlserver://sa:senha_incorreta@localhost:9999?database=invalid_db&dial+timeout=1")
	defer os.Unsetenv("ConnectionStrings__SqlServer")

	db, err := database.ConnectDB()

	// Deve retornar erro de conexao sem pânico
	assert.Error(t, err)
	assert.Nil(t, db)
}
