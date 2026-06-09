# Home Library App

A highly optimized, multi-lingual Single Page Application (SPA) designed as the frontend interface for the Home Library infrastructure. Built with **SvelteKit** and **TypeScript**, and statically served via an ultra-lightweight **Nginx** Alpine container.

## Architectural Overview

This frontend prioritizes blazing-fast performance, real-time feedback, and accessibility, completely decoupled from the backend logic:

* **SvelteKit (Static Adapter):** The application is strictly compiled ahead-of-time into static HTML, CSS, and JS. There is no Node.js runtime process required in production, completely eliminating server-side rendering overhead.
* **Global State Management:** Leverages Svelte stores to securely manage JWT authentication tokens and maintain real-time UI synchronization across components.
* **Internationalization (i18n):** Implements a robust, fully typed custom localization engine, currently supporting English (`en`) and Spanish (`es`).
* **Intelligent Autofill:** Integrates a proxy architecture to scan barcodes or parse ISBN/OCLC numbers, dynamically populating form fields by pulling from external providers (Open Library).

## Deployment Topology

The application is deployed using a highly efficient multi-stage Docker build process:

1. **Build Stage (`node:20-alpine`):** Ingests the source code, resolves dependencies via `npm ci`, and executes `npm run build` using the `@sveltejs/adapter-static` plugin.
2. **Runtime Stage (`nginx:alpine`):** A pristine Nginx layer that copies only the finalized `/build` output. The `nginx.conf` is optimized for SPA routing (fallback to `index.html`) and serves the assets utilizing the high-performance `epoll` event mechanism.

This architecture ensures the final Docker image footprint is strictly limited to static assets and a web server, resulting in negligible memory consumption on the homelab host.

## Development Environment

### Prerequisites
* Node.js (v20+)
* npm

### Local Initialization

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/iago-fernandez/home-library-app.git
   cd home-library-app
   npm install
   ```

2. Configure local proxying:
   The `vite.config.js` is set up to automatically proxy `/api` and `/auth` requests to the remote backend (`http://homelibrary.lan`). Ensure your network or WireGuard VPN can resolve this host, or temporarily update the Vite proxy target for local API testing.

3. Launch the development server:
   ```bash
   npm run dev
   ```

## Key Components

* **API Client (`src/lib/api/client.ts`):** A robust fetch wrapper that automatically handles JWT injection, dynamic URL construction for relative routing (`/api/*`), and HTTP error parsing.
* **Form Engine:** Advanced input abstractions (`ChipInput`, `AutoExpandTextarea`, `BarcodeScannerModal`) engineered for high-density data entry.
* **Bulk Processing:** The architecture supports multi-selection grids and batch editing mechanisms, allowing users to modify or delete hundreds of entries simultaneously.

## Contributing

Contributions must strictly adhere to SvelteKit best practices and maintain the architectural purity of a Static SPA. Please review the [CONTRIBUTING.md](CONTRIBUTING.md) file for branching strategies, semantic versioning, and Conventional Commits guidelines.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
