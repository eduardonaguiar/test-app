## Project Overview

This repository contains a local-first study exam simulator.

The product goal is to allow a user to:

- import complete exams from structured JSON files;
- run timed exams locally;
- support reconnect/rejoin policies similar to real certification platforms;
- persist progress and answers locally;
- show score, correct answers, and explanations at the end;
- keep local attempt history for review and knowledge retention.

This is a local study tool.
It is not a multi-tenant SaaS platform.
It is not a distributed enterprise system.

The implementation must favor:

- pragmatic architecture;
- strong domain modeling;
- explicit contracts;
- ease of local development;
- ease of evolution;
- offline-first behavior.

---

## Locked Technology Stack

The stack is fixed unless an explicit architectural change is requested and documented in an ADR.

### Frontend
- React
- Vite
- TypeScript

### Backend
- .NET 8
- ASP.NET Core
- Minimal APIs or Controllers are allowed, but the codebase must remain modular and not collapse all logic into `Program.cs`

### Database
- SQLite

### Persistence
- Entity Framework Core

### Backend Validation
- FluentValidation

### API Contract
- OpenAPI / Swagger
- Frontend-backend integration must rely on HTTP contracts, not direct shared runtime types

### Frontend Validation
- Zod may be used in the frontend where useful, especially for local form handling
- JSON exam file validation rules must have a formal schema definition

### Testing
- Backend: xUnit + FluentAssertions
- Backend integration tests: `WebApplicationFactory`
- Frontend: Vitest

### Dev Environment
- Docker
- Docker Compose

### Monorepo Tooling
- `pnpm` for frontend and JS/TS packages
- `.NET solution` for backend projects
- hybrid monorepo structure

Do not replace the backend with Node.js.
Do not replace SQLite with a server database for the MVP.
Do not introduce microservices.

---

## Monorepo Strategy

This repository is a hybrid monorepo.

It contains:

- a JS/TS workspace for frontend and optional frontend-side packages;
- a .NET solution for backend projects;
- shared schema/contracts stored as language-neutral artifacts whenever possible.

The repository must remain easy to understand for a single developer.

---

## Repository Structure

Target structure:

```text
/
  apps/
    web/
    api/
      src/
        ExamRunner.Api/
        ExamRunner.Application/
        ExamRunner.Domain/
        ExamRunner.Infrastructure/
      tests/
        ExamRunner.UnitTests/
        ExamRunner.IntegrationTests/
  contracts/
    exam-schema/
      examples/
  packages/
    ui/
  infra/
    docker/
  docs/
````

### Responsibilities

#### `apps/web`

Frontend application for:

* exam list;
* exam details;
* instructions;
* timed exam execution;
* answer navigation;
* result review;
* history.

#### `apps/api/src/ExamRunner.Api`

HTTP entry point.

Responsibilities:

* endpoint registration;
* application bootstrap;
* Swagger/OpenAPI;
* dependency injection;
* middleware;
* request/response mapping.

#### `apps/api/src/ExamRunner.Application`

Application layer.

Responsibilities:

* use cases;
* command/query orchestration;
* application services;
* DTO orchestration;
* validation flow integration.

#### `apps/api/src/ExamRunner.Domain`

Domain layer.

Responsibilities:

* entities;
* value objects;
* enums;
* core business rules;
* domain invariants.

#### `apps/api/src/ExamRunner.Infrastructure`

Infrastructure layer.

Responsibilities:

* EF Core setup;
* SQLite persistence;
* repositories;
* file import adapters;
* time provider implementation;
* persistence and externalized technical concerns.

#### `apps/api/tests/ExamRunner.UnitTests`

Unit tests for domain and application logic.

#### `apps/api/tests/ExamRunner.IntegrationTests`

Integration tests for API and persistence behavior.

#### `contracts/exam-schema`

Language-neutral artifacts related to exam import format.

Responsibilities:

* official JSON schema;
* schema versioning;
* sample exam files;
* format documentation support files.

#### `packages/ui`

Optional reusable frontend UI components.

---

## Architecture Direction

Use a modular layered architecture.

The preferred dependency direction is:

* `Api` depends on `Application`
* `Application` depends on `Domain`
* `Infrastructure` depends on `Application` and `Domain`
* `Domain` depends on nothing project-specific

Keep domain rules out of controllers/endpoints.
Keep EF Core entities and persistence concerns out of the domain model unless there is a deliberate, documented reason.

The backend must be the source of truth for:

* timer calculation;
* submission state;
* reconnect policy enforcement;
* scoring result persistence.

---

## Primary Goals

Build a monorepo-based solution with Docker Compose for local development.

The system must support:

1. exam import from structured JSON files;
2. timed execution of exams;
3. configurable reconnect policy;
4. automated scoring;
5. final review with explanations;
6. local history of attempts.

---

## Non-Goals

Do not introduce the following unless explicitly requested:

* multi-tenant support;
* distributed microservices;
* cloud infrastructure dependencies;
* external server databases for the MVP;
* Kafka, RabbitMQ, or similar brokers;
* webcam proctoring;
* complex IAM;
* event sourcing;
* CQRS-heavy architecture;
* premature plugin systems;
* speculative scale patterns.

This project should remain intentionally compact and evolvable.

---

## Functional Scope of the MVP

### Exam Import

The system must:

* import an exam from JSON;
* validate the file against the official schema;
* reject invalid files with clear validation messages;
* persist imported exam structure locally.

### Exam Execution

The system must:

* start an attempt;
* render questions and options;
* support question navigation;
* persist answers during the attempt;
* show remaining time;
* allow final submission;
* auto-finish on timeout.

### Reconnect Policy

The system must:

* support reconnect/rejoin logic per exam;
* track reconnect attempts;
* apply grace period rules;
* finalize the attempt if reconnect policy is exceeded.

### Final Review

The system must:

* calculate score;
* show correct and incorrect answers;
* show correct answer per question;
* show summary and detailed explanation;
* show per-topic performance if topic metadata exists.

### History

The system must:

* list past attempts;
* show score and total time spent;
* allow opening a past result review.

---

## Exam File Format

The official import format is JSON.

It must support at least:

* `schemaVersion`
* exam metadata
* duration in minutes
* passing score
* reconnect policy
* sections
* questions
* options
* correct answer
* explanation summary
* explanation details
* topic
* difficulty
* weight

The format must be easy for LLMs to generate and easy for the backend to validate.

Create and maintain:

* a formal JSON schema;
* at least two example exam files;
* documentation explaining the format.

The schema must live in `contracts/exam-schema`.

---

## Backend API Expectations

The backend should expose endpoints equivalent to:

* `GET /health`
* `POST /exams/import`
* `GET /exams`
* `GET /exams/{examId}`
* `POST /attempts`
* `GET /attempts/{attemptId}`
* `PUT /attempts/{attemptId}/answers/{questionId}`
* `POST /attempts/{attemptId}/reconnect`
* `POST /attempts/{attemptId}/submit`
* `GET /attempts/{attemptId}/result`
* `GET /history`

Use OpenAPI/Swagger to document the contract.

Do not assume shared TypeScript types between frontend and backend.
Contracts must be stable at the HTTP boundary.

---

## Exam Engine Rules

### Timer

The backend is the source of truth for time.

Rules:

* calculate `StartedAt` and `DeadlineAt` when an attempt starts;
* never trust the frontend as the official timer source;
* every important action must consider official backend time;
* on timeout, the attempt must be finalized automatically.

The frontend may display a countdown for UX purposes, but it is not authoritative.

### Reconnect

Reconnect policy is configured per exam.

Support these concepts:

* enabled or disabled;
* maximum reconnect count;
* grace period in seconds;
* termination if exceeded.

When the attempt resumes:

* calculate offline duration;
* compare against reconnect policy;
* allow resume if valid;
* finalize if invalid;
* persist reconnect events.

---

## Data Model Expectations

Model at least these entities:

* `Exam`
* `Section`
* `Question`
* `Option`
* `Attempt`
* `AttemptAnswer`
* `AttemptResult`
* `ReconnectEvent`

Rules:

* imported exam structure must be reconstructable;
* answers must be persisted per question;
* attempt state must be persisted;
* final result should be viewable without fragile recalculation;
* reconnect events must be queryable.

Use EF Core migrations.
Use SQLite for the MVP.

---

## Frontend Expectations

The frontend should include at least:

* imported exams list page;
* exam details page;
* pre-start instructions page;
* exam execution screen with timer;
* navigation between questions;
* answered/pending indicators;
* final submission flow;
* result review screen;
* history screen.

The UX should feel serious, clean, and study-oriented.

Avoid noisy, flashy, or overly gamified design unless explicitly requested.

---

## Docker Compose Expectations

The development environment must run via Docker Compose.

At minimum, provide:

* `web` service
* `api` service

SQLite may live inside the API container, but persistence must be preserved with a mounted volume and clearly documented.

Goals of the compose setup:

* one-command local startup;
* predictable developer experience;
* no dependency on external cloud infrastructure;
* simple local onboarding.

---

## Dockerfile Expectations

Create development-oriented Dockerfiles for frontend and backend.

### Frontend container

Must support:

* Vite development server;
* bind mount friendly behavior;
* predictable dev startup.

### Backend container

Must support:

* `dotnet restore`
* `dotnet watch` or equivalent local dev command
* EF Core tooling if needed for migrations
* bind mount friendly behavior

Do not over-optimize images prematurely.

---

## Code Quality Rules

Use these rules:

### General

* clear naming;
* explicit boundaries;
* small focused functions;
* low coupling;
* no hidden shared state;
* readable code over clever abstractions.

### Backend

* strict separation of layers;
* keep business rules in domain/application, not in endpoints;
* use FluentValidation for request validation and command validation where applicable;
* use clear error responses;
* keep `Program.cs` lean.

### Frontend

* keep UI components composable and readable;
* isolate screen logic from reusable visual components where practical;
* avoid excessive state complexity.

### Type Safety

* use TypeScript strictly in frontend packages;
* use modern C# patterns with nullable reference types enabled in backend projects.

---

## Root-Level Commands

The repository should provide clear commands for both frontend and backend development.

Examples of expected intent:

* install dependencies
* run local development
* build frontend
* build backend
* run tests
* run lint
* run type checks
* start compose
* stop compose
* run database migrations
* seed example data if needed

Use root documentation to explain the exact commands.

For JS/TS parts, use `pnpm`.
For backend parts, use `dotnet` commands.

---

## Testing Expectations

At minimum, include tests for:

### Backend

* exam schema validation flow;
* scoring logic;
* reconnect logic;
* attempt submission rules;
* integration tests for main endpoints.

### Frontend

* critical UI behavior where practical;
* utility logic tests as needed.

Focus first on correctness of critical flows.

---

## Required Documentation

Create and maintain at least:

* `README.md`
* `docs/architecture.md`
* `docs/adr/0001-monorepo.md`
* `docs/adr/0002-stack.md`
* `docs/adr/0003-timer-and-reconnect.md`
* `docs/exam-json-format.md`

Documentation must reflect the actual implementation.

Do not document imagined future architecture as if it already exists.

---

## Working Style for Agents

Work incrementally.

Recommended sequence:

1. create monorepo structure;
2. create .NET solution and backend projects;
3. create frontend app;
4. add Docker Compose;
5. add exam schema contract artifacts;
6. add EF Core persistence;
7. implement exam import;
8. implement attempt lifecycle and timer;
9. implement scoring;
10. implement final review;
11. improve docs and tests.

After each meaningful step:

* keep the project runnable;
* avoid leaving the repo broken;
* document major decisions.

---

## Milestone 1 Definition of Done

Milestone 1 is complete when:

* the hybrid monorepo is working;
* `docker compose up` starts the environment;
* frontend and backend are reachable;
* a valid exam JSON file can be imported;
* imported exams can be listed;
* an attempt can be started;
* the timer works;
* answers can be saved;
* the attempt can be submitted;
* the result screen shows score and explanations.

---

## What to Avoid

Do not introduce:

* Node.js backend replacement;
* unnecessary service decomposition;
* message brokers;
* server database dependencies for MVP;
* complex auth flows;
* speculative extensibility frameworks;
* premature CQRS/event sourcing.

Keep the product local, understandable, and maintainable.

---

## Decision-Making Guidance

When choosing between alternatives, prefer the option that:

* keeps the local developer experience simple;
* preserves explicit boundaries;
* supports reliable timed exam execution;
* makes exam import robust;
* keeps backend business logic clean and testable in .NET;
* makes future evolution possible without current over-complexity.

If a decision matters, record it as an ADR.

---

## Expected End State

The repository should evolve into a clean local-first study exam simulator with:

* React + Vite frontend;
* .NET 8 + ASP.NET Core backend;
* SQLite + EF Core persistence;
* FluentValidation-based backend validation;
* Docker Compose local development;
* formal JSON exam import format;
* timed attempt engine;
* reconnect policy handling;
* scoring and review experience;
* maintainable architecture and documentation.

Agents should always move the codebase toward that outcome.

```


