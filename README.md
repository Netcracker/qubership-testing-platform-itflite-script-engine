# Qubership Testing Platform ITF Lite Script Engine

## Description

`qstp-itf-lite-script-engine` is a service for executing pre-processing and post-processing scripts for HTTP requests. It provides isolated JavaScript execution in a sandbox environment with access to request/response objects, environment variables, and custom variable scopes.

The service is designed for API integration and automation systems that require flexible and secure request scripting capabilities.

## Features

- Executes `pre` and `post` JavaScript scripts.
- Supports environment, collection, global, and runtime variables.
- Secure sandboxed execution (`postman-sandbox`).
- Works with HTTP request/response models including headers, body, and query parameters.
- Exposes metrics and structured logging (Prometheus, Graylog).

## Installation

Make sure you have Node.js (v18 or higher) and `npm` installed.

```bash
npm install
npm run start
```

## Run Locally

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

# How to deploy tool

1. Build snaphot (artifacts and docker image) of https://github.com/Netcracker/qubership-testing-platform-itflite-script-engine in GitHub
2. Clone repository to a place, available from your openshift/kubernetes where you need to deploy the tool to
3. Navigate to <repository-root>/deployments/charts/atp-itf-lite-script-engine folder
4. Check/change configuration parameters in the ./values.yaml file according to your services installed
5. Execute the command: helm install atp-itf-lite-script-engine
6. After installation is completed, check deployment health

## Metrics and Logging

The service integrates with Prometheus and Graylog. Available metrics include:

- Incoming request size (`ITF_LITE_REQUESTS_SIZE`)
- Outgoing response size (`ITF_LITE_RESPONSES_SIZE`)
- Variable scope size (`CONTEXT_SIZE`)

## Request Structure

The input payload must include:

- A JavaScript script to execute
- HTTP request and (optional) response objects
- Variable scopes (environment, collection, globals, runtime)
- Project and request identifiers (used for logging and metrics)

## Test

```bash
# unit tests
$ npm run test

# test coverage
$ npm run test:cov
```
