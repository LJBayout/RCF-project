# CFR Data Platform - TODO

## Banco de Dados e Schema
- [x] Criar tabela `cfr_titles` para armazenar títulos do CFR
- [x] Criar tabela `cfr_parts` para armazenar partes
- [x] Criar tabela `cfr_sections` para armazenar seções com conteúdo completo
- [x] Criar tabela `api_keys` para gerenciar chaves de API
- [x] Criar tabela `subscriptions` para gerenciar planos (Free, Pro, Enterprise)
- [x] Criar tabela `api_usage` para rastrear uso da API
- [x] Adicionar índices para busca eficiente

## Parser XML e Ingestão de Dados
- [ ] Criar parser XML para processar arquivos CFR
- [ ] Implementar extração de Title, Part, Section e conteúdo
- [ ] Criar endpoint administrativo para upload de XML
- [ ] Implementar processamento em background para arquivos grandes
- [ ] Adicionar validação e tratamento de erros no parser

## API REST e Autenticação
- [ ] Implementar middleware de autenticação com API keys
- [ ] Criar endpoint `/api/search/fulltext` para busca por texto
- [ ] Criar endpoint `/api/search/title/:titleId` para busca por título
- [ ] Criar endpoint `/api/search/part/:partId` para busca por parte
- [ ] Criar endpoint `/api/search/section/:sectionId` para busca por seção
- [ ] Implementar filtros combinados (title + part + keyword)
- [ ] Adicionar rate limiting por plano (Free: 100/dia, Pro: 10k/dia, Enterprise: ilimitado)
- [ ] Criar sistema de geração de API keys

## Landing Page e Interface Web
- [x] Criar landing page com hero section e proposta de valor
- [x] Adicionar seção de casos de uso (legal, compliance, pesquisa)
- [x] Criar seção de pricing com 3 planos (Free, Pro, Enterprise)
- [x] Implementar interface de busca com preview de resultados
- [x] Adicionar página de documentação da API
- [x] Criar exemplos de código em múltiplas linguagens (Python, JavaScript, cURL)
- [ ] Adicionar página de registro de usuários

## Dashboard Administrativo
- [x] Criar dashboard com métricas de uso da API
- [x] Mostrar usuários ativos e planos de assinatura
- [ ] Exibir gráficos de requisições por dia/semana/mês
- [x] Listar queries mais populares
- [x] Adicionar gerenciamento de usuários e API keys
- [x] Implementar visualização de logs de API

## Sistema de Pagamentos
- [ ] Integrar Stripe para processamento de pagamentos
- [ ] Criar fluxo de checkout para planos Pro e Enterprise
- [ ] Implementar webhooks do Stripe para atualizar assinaturas
- [ ] Adicionar gerenciamento de assinaturas (upgrade/downgrade/cancelamento)
- [ ] Criar página de billing para usuários

## Testes e Qualidade
- [ ] Escrever testes para parser XML
- [ ] Escrever testes para endpoints de busca
- [ ] Escrever testes para rate limiting
- [ ] Escrever testes para autenticação com API keys
- [ ] Testar integração com Stripe

## Documentação
- [ ] Documentar estrutura do banco de dados
- [ ] Documentar endpoints da API com exemplos
- [ ] Criar guia de início rápido
- [ ] Adicionar exemplos de integração
