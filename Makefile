# Docker Hub Configuration
# Set DOCKER_HUB_USER to your Docker Hub username, or pass as argument:
#   make publish DOCKER_HUB_USER=myusername
DOCKER_HUB_USER ?= $(shell echo $$DOCKER_HUB_USER)
IMAGE = notionviz
TAG = latest
FULL_IMAGE = $(DOCKER_HUB_USER)/$(IMAGE):$(TAG)

.PHONY: help build run publish

## help: Show available make targets
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^## ' Makefile | sed 's/## /  /'

## build: Build the Docker image locally
build:
	docker build -t $(IMAGE):$(TAG) .

## run: Start the app with docker-compose
run:
	docker-compose up

## publish: Build, tag, and push image to Docker Hub
##          Requires DOCKER_HUB_USER to be set
##          Usage: make publish DOCKER_HUB_USER=your-username
publish:
	@if [ -z "$(DOCKER_HUB_USER)" ]; then \
		echo "Error: DOCKER_HUB_USER is not set."; \
		echo "Usage: make publish DOCKER_HUB_USER=your-username"; \
		exit 1; \
	fi
	docker build -t $(FULL_IMAGE) .
	docker push $(FULL_IMAGE)
	@echo "Published: $(FULL_IMAGE)"
