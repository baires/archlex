# @archlex/aws

AWS provider for ArchLex architecture diagrams.

## Installation

```bash
npm install @archlex/aws
```

## Usage

```typescript
import { AwsProvider } from '@archlex/aws';

const provider = new AwsProvider();

// Get AWS service icon
const ec2Icon = provider.getIcon('ec2');

// List all available AWS services
const services = provider.listServices();
```

## Features

- Official AWS service icons
- Comprehensive service catalog
- Type-safe service definitions
- Auto-generated from AWS Architecture Icons

## Available Services

Includes 200+ AWS services:
- Compute (EC2, Lambda, ECS, EKS, Fargate)
- Storage (S3, EBS, EFS, FSx)
- Database (RDS, DynamoDB, Aurora, ElastiCache)
- Networking (VPC, CloudFront, Route53, API Gateway)
- Security (IAM, Cognito, WAF, Shield)
- And many more...

## Documentation

Visit [archlex.dev](https://archlex.dev) for full documentation.

## License

MIT
