package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	ErrProdutoNaoEncontradoNoCache = errors.New("produto nao encontrado no cache do estoque")
)

type ProdutoCache struct {
	Codigo    string `json:"codigo"`
	Descricao string `json:"descricao"`
	Saldo     int    `json:"saldo"`
}

type RedisCacheService struct {
	client *redis.Client
}

func NewRedisCacheService() *RedisCacheService {
	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = os.Getenv("ConnectionStrings__Redis")
	}
	if redisHost == "" {
		redisHost = "localhost:6379"
	}
	if !strings.Contains(redisHost, ":") {
		redisHost = redisHost + ":6379"
	}

	client := redis.NewClient(&redis.Options{
		Addr:        redisHost,
		DialTimeout: 2 * time.Second,
		ReadTimeout: 2 * time.Second,
	})

	return &RedisCacheService{client: client}
}

func (r *RedisCacheService) IsConnected(ctx context.Context) bool {
	if r == nil || r.client == nil {
		return false
	}
	return r.client.Ping(ctx).Err() == nil
}

func (r *RedisCacheService) GetProduto(ctx context.Context, codigo string) (*ProdutoCache, error) {
	if r == nil || r.client == nil {
		return nil, nil // Se o Redis nao estiver configurado, ignora
	}

	key := fmt.Sprintf("produto:codigo:%s", strings.ToUpper(strings.TrimSpace(codigo)))
	val, err := r.client.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			slog.Warn("Produto nao encontrado no cache do Redis", slog.String("codigo", codigo), slog.String("key", key))
			return nil, ErrProdutoNaoEncontradoNoCache
		}
		slog.Error("Erro ao consultar Redis", slog.String("error", err.Error()), slog.String("codigo", codigo))
		return nil, err
	}

	var prod ProdutoCache
	if err := json.Unmarshal([]byte(val), &prod); err != nil {
		return nil, fmt.Errorf("falha ao desserializar produto do Redis: %w", err)
	}

	return &prod, nil
}
