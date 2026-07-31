# Tier 2 AWS Services: Application Services

**Target**: 45-50 services  
**Priority**: High  
**Timeline**: Week 3-4  
**Release**: v0.3.0

## Status Summary

- **Total Services**: 48
- **Completed**: 0
- **In Progress**: 0
- **Not Started**: 48

## Application Integration (5 services)

- [ ] **Step Functions** - `step-functions`
- [ ] **AWS AppFlow** - `appflow`
- [ ] **AppSync** - `appsync`
- [ ] **Amazon MQ** - `mq`
- [ ] **Amazon MSK** (Managed Kafka) - `msk`

## Analytics (10 services)

- [ ] **Kinesis Data Streams** - `kinesis-streams`
- [ ] **Kinesis Data Firehose** - `kinesis-firehose`
- [ ] **Kinesis Data Analytics** - `kinesis-analytics`
- [ ] **EMR** (Elastic MapReduce) - `emr`
- [ ] **AWS Glue** - `glue`
- [ ] **Athena** - `athena`
- [ ] **Redshift** - `redshift`
- [ ] **QuickSight** - `quicksight`
- [ ] **OpenSearch Service** - `opensearch`
- [ ] **Data Pipeline** - `data-pipeline`

## AI/ML (10 services)

- [ ] **SageMaker** - `sagemaker`
- [ ] **Amazon Bedrock** - `bedrock`
- [ ] **Rekognition** - `rekognition`
- [ ] **Comprehend** - `comprehend`
- [ ] **Translate** - `translate`
- [ ] **Polly** - `polly`
- [ ] **Transcribe** - `transcribe`
- [ ] **Lex** - `lex`
- [ ] **Kendra** - `kendra`
- [ ] **Forecast** - `forecast`

## Developer Tools (7 services)

- [ ] **CodePipeline** - `codepipeline`
- [ ] **CodeBuild** - `codebuild`
- [ ] **CodeDeploy** - `codedeploy`
- [ ] **CodeCommit** - `codecommit`
- [ ] **Cloud9** - `cloud9`
- [ ] **CodeArtifact** - `codeartifact`
- [ ] **CodeGuru** - `codeguru`

## Containers (5 services)

- [ ] **Amazon ECR** (Elastic Container Registry) - `ecr`
- [ ] **ECS Anywhere** - `ecs-anywhere`
- [ ] **EKS Add-ons** - `eks-addons`
- [ ] **App Mesh** - `app-mesh`
- [ ] **Copilot** - `copilot`

## Serverless (6 services)

- [ ] **EventBridge Scheduler** - `eventbridge-scheduler`
- [ ] **Step Functions Express** - `step-functions-express`
- [ ] **Lambda@Edge** - `lambda-edge`
- [ ] **Lambda Layers** - `lambda-layers`
- [ ] **SAM** (Serverless Application Model) - `sam`
- [ ] **Application Composer** - `application-composer`

## Messaging (5 services)

- [ ] **Amazon Pinpoint** - `pinpoint`
- [ ] **Simple Email Service (SES)** - `ses`
- [ ] **Simple Notification Service Mobile** - `sns-mobile`
- [ ] **EventBridge Pipes** - `eventbridge-pipes`
- [ ] **EventBridge API Destinations** - `eventbridge-api-destinations`

## Validation Rules to Add (5-7 rules)

- [ ] Step Functions should reference valid Lambda/ECS tasks
- [ ] Kinesis Firehose should have valid destination (S3/Redshift/OpenSearch)
- [ ] SageMaker endpoints should be in VPC for private training
- [ ] CodePipeline should have valid source/build/deploy stages
- [ ] EventBridge rules should have valid targets

## Relationship Types to Add

- `processes` (Kinesis/Glue/EMR → data)
- `transforms` (Glue/Data Pipeline → data)
- `orchestrates` (Step Functions → services)
- `triggers` (EventBridge → services)
- `schedules` (EventBridge Scheduler → services)
- `streams` (Kinesis → consumers)
- `builds` (CodeBuild → artifacts)
- `deploys` (CodeDeploy → targets)

## Notes

- Kinesis services should be separate (Streams, Firehose, Analytics)
- Step Functions Express is different from standard Step Functions
- Lambda@Edge is distinct from regular Lambda (edge deployment)
- Amazon Bedrock is the managed generative AI service
