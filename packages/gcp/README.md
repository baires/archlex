# @archlex/gcp

GCP provider for ArchLex architecture diagrams.

## Installation

```bash
npm install @archlex/gcp
```

## Usage

```typescript
import { GcpProvider } from '@archlex/gcp';

const provider = new GcpProvider();

// Get GCP service icon
const computeIcon = provider.getIcon('compute-engine');

// List all available GCP services
const services = provider.listServices();
```

## Features

- Official GCP service icons
- Comprehensive service catalog
- Type-safe service definitions
- Auto-generated from Google Cloud Architecture Icons

## Available Services

Includes 100+ GCP services:
- Compute (Compute Engine, Cloud Functions, Cloud Run, GKE)
- Storage (Cloud Storage, Persistent Disk, Filestore)
- Database (Cloud SQL, Firestore, Bigtable, Spanner)
- Networking (VPC, Cloud Load Balancing, Cloud CDN, Cloud DNS)
- Security (IAM, Identity Platform, Cloud Armor)
- And many more...

## Documentation

Visit [archlex.dev](https://archlex.dev) for full documentation.

## License

MIT
