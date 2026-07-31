# Tier 3 AWS Services: Specialized Services

**Target**: 50-60 services  
**Priority**: Medium  
**Timeline**: Week 5-6  
**Release**: v0.4.0

## Status Summary

- **Total Services**: 55
- **Completed**: 0
- **In Progress**: 0
- **Not Started**: 55

## IoT (5 services)

- [ ] **IoT Core** - `iot-core`
- [ ] **IoT Analytics** - `iot-analytics`
- [ ] **IoT Events** - `iot-events`
- [ ] **IoT Greengrass** - `iot-greengrass`
- [ ] **IoT SiteWise** - `iot-sitewise`

## Media (8 services)

- [ ] **MediaLive** - `medialive`
- [ ] **MediaConvert** - `mediaconvert`
- [ ] **MediaPackage** - `mediapackage`
- [ ] **MediaConnect** - `mediaconnect`
- [ ] **Elemental MediaTailor** - `mediatailor`
- [ ] **Interactive Video Service (IVS)** - `ivs`
- [ ] **Kinesis Video Streams** - `kinesis-video`
- [ ] **MediaStore** - `mediastore`

## Gaming (2 services)

- [ ] **Amazon GameLift** - `gamelift`
- [ ] **GameSparks** - `gamesparks`

## End User Computing (5 services)

- [ ] **WorkSpaces** - `workspaces`
- [ ] **AppStream 2.0** - `appstream`
- [ ] **WorkDocs** - `workdocs`
- [ ] **WorkLink** - `worklink`
- [ ] **WorkMail** - `workmail`

## Contact Center (3 services)

- [ ] **Amazon Connect** - `connect`
- [ ] **Connect Customer Profiles** - `connect-customer-profiles`
- [ ] **Connect Voice ID** - `connect-voice-id`

## Business Applications (4 services)

- [ ] **Amazon Chime** - `chime`
- [ ] **Amazon Honeycode** - `honeycode`
- [ ] **WorkSpaces Web** - `workspaces-web`
- [ ] **Wickr** - `wickr`

## Blockchain (2 services)

- [ ] **Amazon Managed Blockchain** - `managed-blockchain`
- [ ] **Amazon QLDB** (Quantum Ledger) - `qldb`

## Robotics & AR/VR (3 services)

- [ ] **AWS RoboMaker** - `robomaker`
- [ ] **Amazon Sumerian** - `sumerian`
- [ ] **IoT RoboRunner** - `iot-roborunner`

## Migration (10 services)

- [ ] **Database Migration Service (DMS)** - `dms`
- [ ] **Server Migration Service (SMS)** - `sms`
- [ ] **DataSync** - `datasync`
- [ ] **Transfer Family** - `transfer-family`
- [ ] **Migration Hub** - `migration-hub`
- [ ] **Application Discovery Service** - `application-discovery`
- [ ] **Application Migration Service** - `application-migration`
- [ ] **Migration Evaluator** - `migration-evaluator`
- [ ] **CloudEndure Migration** - `cloudendure`
- [ ] **Mainframe Modernization** - `mainframe-modernization`

## Supply Chain & Industrial (5 services)

- [ ] **Supply Chain** - `supply-chain`
- [ ] **IoT TwinMaker** - `iot-twinmaker`
- [ ] **Monitron** - `monitron`
- [ ] **Panorama** - `panorama`
- [ ] **Private 5G** - `private-5g`

## Customer Engagement (4 services)

- [ ] **Amazon Pinpoint (SMS/Email)** - `pinpoint-engagement`
- [ ] **Simple Email Service** - `ses`
- [ ] **Amazon SNS** - `sns`
- [ ] **Amazon SES** - `ses`

## Compute (4 services)

- [ ] **Elastic Beanstalk** - `elastic-beanstalk`
- [ ] **Lightsail** - `lightsail`
- [ ] **SimSpace Weaver** - `simspace-weaver`
- [ ] **Compute Optimizer** - `compute-optimizer`

## Validation Rules to Add (0-3 rules)

- [ ] IoT Greengrass should be deployed to edge devices
- [ ] MediaLive should output to MediaPackage or MediaStore
- [ ] DMS should have valid source and target endpoints

## Relationship Types to Add

- `transcodes` (MediaConvert → media)
- `packages` (MediaPackage → streams)
- `migrates` (DMS/SMS → targets)
- `discovers` (Application Discovery → infrastructure)

## Notes

- Media services form a complete video processing pipeline
- IoT services are for industrial and consumer IoT scenarios
- Migration services are important for cloud adoption diagrams
- Gaming services are specialized but important for that vertical
- Many services are domain-specific and may not have extensive validation rules
