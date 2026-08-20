package architecture_test

import (
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// getInternalDir retorna o caminho absoluto para a pasta internal do microsservico de Faturamento.
func getInternalDir(t *testing.T) string {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Erro ao obter diretorio de trabalho atual: %v", err)
	}

	idx := strings.Index(wd, "internal")
	if idx == -1 {
		t.Fatalf("Nao foi possivel localizar o diretorio 'internal' a partir de %s", wd)
	}

	return wd[:idx+len("internal")]
}

// TestDomainLayerIndependence verifica que a camada de Dominio e pura e nao depende de outras camadas.
func TestDomainLayerIndependence(t *testing.T) {
	internalDir := getInternalDir(t)
	domainDir := filepath.Join(internalDir, "domain")

	forbiddenImports := []string{
		"faturamento-api/internal/handlers",
		"faturamento-api/internal/repository",
		"faturamento-api/internal/database",
		"faturamento-api/internal/messaging",
		"faturamento-api/internal/middleware",
		"faturamento-api/internal/cache",
		"github.com/gin-gonic/gin",
		"net/http",
	}

	fset := token.NewFileSet()
	err := filepath.Walk(domainDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".go") {
			return err
		}

		node, err := parser.ParseFile(fset, path, nil, parser.ImportsOnly)
		if err != nil {
			t.Errorf("Erro ao analisar arquivo %s: %v", path, err)
			return nil
		}

		for _, imp := range node.Imports {
			importPath := strings.Trim(imp.Path.Value, `"`)
			for _, forbidden := range forbiddenImports {
				if strings.Contains(importPath, forbidden) {
					t.Errorf("VIOLACAO ARQUITETURAL [Fitness Function]: O arquivo de Dominio '%s' nao pode importar '%s'", filepath.Base(path), importPath)
				}
			}
		}

		return nil
	})

	if err != nil {
		t.Fatalf("Erro ao percorrer o diretorio de dominio: %v", err)
	}
}

// TestRepositoryLayerIsolation garante que Repositorios nao dependam de Handlers/HTTP.
func TestRepositoryLayerIsolation(t *testing.T) {
	internalDir := getInternalDir(t)
	repoDir := filepath.Join(internalDir, "repository")

	forbiddenImports := []string{
		"faturamento-api/internal/handlers",
		"github.com/gin-gonic/gin",
	}

	fset := token.NewFileSet()
	err := filepath.Walk(repoDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".go") {
			return err
		}

		node, err := parser.ParseFile(fset, path, nil, parser.ImportsOnly)
		if err != nil {
			t.Errorf("Erro ao analisar arquivo %s: %v", path, err)
			return nil
		}

		for _, imp := range node.Imports {
			importPath := strings.Trim(imp.Path.Value, `"`)
			for _, forbidden := range forbiddenImports {
				if strings.Contains(importPath, forbidden) {
					t.Errorf("VIOLACAO ARQUITETURAL [Fitness Function]: O repositorio '%s' nao pode depender de '%s'", filepath.Base(path), importPath)
				}
			}
		}

		return nil
	})

	if err != nil {
		t.Fatalf("Erro ao percorrer diretorio de repositorios: %v", err)
	}
}

// TestHandlerNamingConventions valida a padronizacao dos arquivos na camada de Handlers HTTP.
func TestHandlerNamingConventions(t *testing.T) {
	internalDir := getInternalDir(t)
	handlersDir := filepath.Join(internalDir, "handlers")

	allowedFiles := map[string]bool{
		"health.go":   true,
		"response.go": true,
	}

	err := filepath.Walk(handlersDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".go") {
			return err
		}

		fileName := filepath.Base(path)
		if allowedFiles[fileName] {
			return nil
		}

		if !strings.HasSuffix(fileName, "_handler.go") && !strings.HasSuffix(fileName, "_test.go") {
			t.Errorf("VIOLACAO DE CONVENCAO [Fitness Function]: O arquivo '%s' em internal/handlers deve terminar com '_handler.go' ou '_test.go'", fileName)
		}

		return nil
	})

	if err != nil {
		t.Fatalf("Erro ao verificar convenções de handlers: %v", err)
	}
}

// TestMessagingLayerIsolation valida o desacoplamento da camada de mensageria RabbitMQ.
func TestMessagingLayerIsolation(t *testing.T) {
	internalDir := getInternalDir(t)
	messagingDir := filepath.Join(internalDir, "messaging")

	forbiddenImports := []string{
		"faturamento-api/internal/handlers",
	}

	fset := token.NewFileSet()
	err := filepath.Walk(messagingDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".go") {
			return err
		}

		node, err := parser.ParseFile(fset, path, nil, parser.ImportsOnly)
		if err != nil {
			t.Errorf("Erro ao analisar arquivo %s: %v", path, err)
			return nil
		}

		for _, imp := range node.Imports {
			importPath := strings.Trim(imp.Path.Value, `"`)
			for _, forbidden := range forbiddenImports {
				if strings.Contains(importPath, forbidden) {
					t.Errorf("VIOLACAO ARQUITETURAL [Fitness Function]: Mensageria '%s' nao pode depender de '%s'", filepath.Base(path), importPath)
				}
			}
		}

		return nil
	})

	if err != nil {
		t.Fatalf("Erro ao percorrer diretorio de mensageria: %v", err)
	}
}
