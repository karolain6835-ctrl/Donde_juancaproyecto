const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'./specs',workers:1,fullyParallel:false,timeout:60000,retries:0,reporter:'list',use:{baseURL:process.env.E2E_WEB_URL,headless:true,trace:'off',screenshot:'off',video:'off'},projects:[{name:'chromium',use:{browserName:'chromium'}}]});
