import React from "react";
import { NativeModules } from "react-native";
const { RNCustomCode } = NativeModules;

import { initialize } from "@blocklienterprise/blockli";
import config from "@src/build_config.json";

export const applyCustomCode = async (externalCodeSetup) => {
  const blockli_config = {
    license: "XXXXXXXXXXXXXXX", // Enter your 15 digit Blockli App Kit license key here. See your account dashboard at https://blockli.dev/dashboard
    app_id: config.app_id,
    code: externalCodeSetup,
    //bcdn_token: "BUNNYCDN-TOKEN-AUTH-KEY",
    website: "https://example-site.com", // Enter your app domain here with NO trailing slash. 
    // NOTE: If you have a staging site, please use a different Git branch for your test app and COPY this entire code to the test branch and enter the staging site domain. 
  };

  await initialize(blockli_config);
};
