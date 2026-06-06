# Docker Hub Configuration
# Set DOCKER_HUB_USER to your Docker Hub username, or pass as argument:
#   make publish DOCKER_HUB_USER=myusername
DOCKER_HUB_USER ?= $(shell echo $$DOCKER_HUB_USER)
IMAGE = vizu-notion-local
TAG = latest
FULL_IMAGE = $(DOCKER_HUB_USER)/$(IMAGE):$(TAG)

.PHONY: help dev build run stop login publish

## help: Show available make targets
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^## ' Makefile | sed 's/## /  /'

## dev: Start the app in development mode (hot reload, no Docker)
dev:
	npm run dev

## build: Build the Docker image
build:
	docker compose build

## run: Build and start the app with Docker Compose
run:
	docker compose up --build

## stop: Stop and remove containers
stop:
	docker compose down

## login: Authenticate with Docker Hub (required before publish)
login:
	docker login

## publish: Build multi-arch image (amd64 + arm64) and push to Docker Hub
##          Run `make login` first if not already authenticated.
##          Usage: make publish DOCKER_HUB_USER=your-username
publish:
	@if [ -z "$(DOCKER_HUB_USER)" ]; then \
		echo "Error: DOCKER_HUB_USER is not set."; \
		echo "Usage: make publish DOCKER_HUB_USER=your-username"; \
		exit 1; \
	fi
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		--tag $(FULL_IMAGE) \
		--push \
		.
	@echo "Published: $(FULL_IMAGE)"
