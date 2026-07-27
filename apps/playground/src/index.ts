import { awsProvider, createCloudMer } from "@cloudmer/core";

const cloudmer = createCloudMer({
  providers: [awsProvider()],
});

console.log("CloudMer initialized in playground:", cloudmer);
