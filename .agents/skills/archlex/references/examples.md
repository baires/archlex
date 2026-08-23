# ArchLex Examples

Complete, validated diagrams to use as starting points.

## AWS microservices

```archlex
direction LR
provider aws

vpc production {
  subnet public {
    api-gateway["API Gateway"] > lambda["Auth Service"]
  }
  subnet private {
    lambda["Auth Service"] -[writes]-> dynamodb["Users Table"]
    lambda["Auth Service"] -[publishes]-> sns["User Events"]
  }
}
```

## AWS web app with CDN, containers, and PocketBase-style backend

```archlex
direction LR
provider aws

dns: route53["Route 53 DNS"]
cdn: cloudfront["CloudFront CDN"]
static: s3["S3 Bucket (static files)"]
lb: alb["Application Load Balancer"]
web: ecs["Next.js on Fargate"]
pb: ec2["PocketBase"]
data: ebs["EBS Volume (SQLite)"]

dns -[routes]-> cdn
cdn -[routes]->|static assets| static
cdn -[proxies]->|SSR + /api/*| lb
lb -[routes]-> web
web -[connects]->|REST + realtime| pb
pb -[writes]-> data
pb -[writes]->|user uploads| static
```

Note: direct CloudFront → S3 traffic emits `AWS-DATA-S3-PUBLIC-001` (info) as
a reminder to configure Origin Access Control.

## AWS relational backend with proxy

```archlex
direction LR
provider aws

vpc application {
  subnet private {
    app: ecs
    proxy: rds-proxy
    database: rds

    app -[connects]-> proxy
    proxy -[connects]-> database
  }
}
```

## GCP data pipeline

```archlex
direction LR
provider gcp

pubsub["Ingest Stream"] > cloud-functions["Process Function"]
cloud-functions["Process Function"] -[writes]-> bigquery["Analytics DB"]
cloud-functions["Process Function"] -[logs]-> cloud-storage["Audit Logs"]
```

## Kubernetes microservices

```archlex
direction LR
provider k8s

cluster production {
  namespace web {
    gateway: ingress
    frontend_service: service
    frontend: deployment
    api_service: service
    api: deployment

    gateway -[routes]-> frontend_service
    frontend_service -[targets]-> frontend
    frontend -[invokes]-> api_service
    api_service -[targets]-> api
  }
}
```
