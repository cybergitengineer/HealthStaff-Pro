# HealthStaff - Healthcare Staffing Platform

## Overview

A multi-tenant, shift-based healthcare staffing platform designed for LTC facilities, homecare agencies, and small clinics. The platform replaces unstructured job postings (WhatsApp/Facebook groups) with a structured, enforceable workflow for temporary healthcare staffing.

The system supports three user roles:
- **Super Admin**: Platform-wide oversight, tenant management, worker verification
- **Facility Admin**: Shift posting and management for their facility
- **Healthcare Worker**: Shift applications, assignments, and profile management

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with Vite for fast development and bundling
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Pattern**: RESTful API served under `/api/*` routes
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Authorization**: Role-based middleware (SUPER_ADMIN, FACILITY_ADMIN, WORKER)
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod schemas generated from Drizzle schemas using drizzle-zod

### Data Layer
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **Schema Location**: `shared/schema.ts` contains all table definitions and types
- **Migrations**: Drizzle Kit for schema migrations (`drizzle-kit push`)
- **Storage Pattern**: Repository pattern implemented in `server/storage.ts`

### Key Data Models
- **Tenants**: Multi-tenant support with configurable rules and pricing
- **Users**: Unified user table with role-based access
- **Worker Profiles**: Extended profile data for healthcare workers
- **Shifts**: Job postings with status workflow (open → offered → filled → completed)
- **Applications**: Worker applications to shifts
- **Assignments**: Confirmed shift assignments with check-in/check-out tracking

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: esbuild bundles server code, Vite builds client to `dist/public`
- **Single Command**: `npm run dev` starts both frontend and backend

## External Dependencies

### Database
- PostgreSQL database required (connection via DATABASE_URL environment variable)
- Drizzle ORM handles all database operations
- Session storage uses connect-pg-simple for PostgreSQL-backed sessions

### Authentication
- JWT tokens for API authentication (SESSION_SECRET environment variable)
- bcryptjs for password hashing
- Token stored in localStorage on client

### UI Framework
- Radix UI primitives for accessible components
- Tailwind CSS for styling
- Lucide React for icons

### Development Tools
- Replit-specific Vite plugins for development experience
- TypeScript for type safety across full stack

## Recent Changes

**January 2026 - MVP Complete**
- Implemented complete multi-tenant healthcare staffing platform
- Added JWT authentication with role-based access control
- Added self-registration for new users (workers and facility admins)
- Built professional healthcare-themed UI with dark mode support
- Created 6-table database schema (tenants, users, workerProfiles, shifts, applications, assignments)
- Added tenant ownership enforcement for all write operations
- Implemented shift application workflow with automatic assignment creation
- Added check-in/check-out functionality for assignments

## Demo Accounts

For testing, the following accounts are pre-seeded:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@example.com | admin123 |
| Facility Admin | facility@example.com | facility123 |
| Healthcare Worker | worker@example.com | worker123 |

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required)
- `SESSION_SECRET` - JWT signing secret (required for security)

## SMS Notifications (Courier Integration)

SMS notifications are enabled via Courier to keep workers informed about shifts and applications.

### Triggers
- **New Shift Posted**: All verified workers receive SMS about new available shifts (workers are independent contractors not bound to specific tenants, so they can apply to any facility's shifts)
- **Application Accepted**: Worker receives SMS confirmation when their application is accepted
- **Application Rejected**: Worker receives SMS notification when their application is not selected

### Configuration
- **Provider**: Courier (courier.com)
- **API Key**: Stored in `COURIER_API_KEY` environment secret
- **Note**: You must configure an SMS provider (like Twilio) in your Courier dashboard for messages to be delivered

### Implementation
- Notification service: `server/notifications.ts`
- Integrated into shift creation and application processing routes