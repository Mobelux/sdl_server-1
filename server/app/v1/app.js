const async = require('async');
const sql = require('sql-bricks');
let express = require('express');
let app = express();
const appRequests = require('./request/index.js')(app);
const functionalGroup = require('./policy/functionalGroup.js')(app);
const appPolicy = require('./policy/appPolicy.js')(app);
const consumerMessages = require('./policy/consumerMessages.js')(app)
const moduleConfig = require('./policy/moduleConfig.js')(app)

module.exports = app;

//get locals from the parent app
app.on("mount", function (parent) {
    app.locals.config = parent.locals.config;
    app.locals.log = parent.locals.log;
    app.locals.db = parent.locals.db;
    app.locals.collectors = parent.locals.collectors;
    app.locals.builder = parent.locals.builder;
    app.locals.events = parent.locals.events;

    app.locals.events.on('update', function () {
        appRequests.forceUpdate(function () {
            //use the updated data to create a new functional group object and save it for later use
            functionalGroup.createFunctionalGroupObject(function () {
                //TODO: don't allow routes to get hit until the update cycle finishes
                app.locals.log.info('Update complete');
            });
        });
    });
});

app.route('/request')
    .get(appRequest);

function appRequest (req, res, next) {
    appRequests.getAppRequests(function (requests) {
        //TODO: use a queue for when webhooks come in so that we can still enforce one at a time request handling
        //operate over every app request received
        //the reason this should be serial is that every app coming in has a chance to contain information
        //the policy server doesn't have. the server needs to do an update cycle when it notices information missing.
        //allowing parallel computation will cause duplicate cycles to run when multiple apps come in with missing information,
        //causing lots of unnecessary load on the SHAID server
        const requestTasks = TEMP_APPS.map(function (request) {
            return function (next) {
                app.locals.log.info(JSON.stringify(request, null, 4));
                appRequests.evaluateAppRequest(request, next);
            }
        });

        async.series(requestTasks, function (err) {
            if (err) {
                app.locals.log.error(err);
            }
            //the end of a very large update cycle
            res.sendStatus(200);
        });
    });
}
//TODO: replace all attempts to compile information from multiple table with using INNER JOINs (ex. appPolicy.js)

//a request came from sdl_core!
app.post('/policy', function (req, res, next) {
    console.log("Got it!");

    async.parallel([
      function(callback){
      moduleConfig.createModuleConfig(function(module_config){
        callback(null, module_config)
      })
    },
    function(callback){
      callback(null, functionalGroup.getFunctionalGroup())
    },
    function(callback){
      consumerMessages.createConsumerMessages(function(consumer_friendly_messages){
        callback(null, consumer_friendly_messages)
      })
    },
    function(callback){
      //given an app id, generate a policy table based on the permissions granted to it
      //iterate over the app_policies object. query the database for matching app ids that have been approved

      //for now, auto approve all apps that request permissions
      appPolicy.createPolicyObject(req.body.policy_table.app_policies, function(appPolicyModified){
        //the original appPolicy object may get modified
        callback(null, appPolicyModified)
      })
    }],
    function(err, done){
      let policyTable = {"policy_table": {}}
      policyTable.policy_table.module_config = done[0]
      policyTable.policy_table.functional_groupings = done[1]
      policyTable.policy_table.consumer_friendly_messages = done[2]
      policyTable.policy_table.app_policies = done[3]
      res.send(policyTable)
    })

    //res.sendStatus(200);
});

//TODO: remove this when there's data in SHAID
const TEMP_APPS = [{
    "uuid": "9bb1d9c2-5d4c-457f-9d91-86a2f95132df",
    "name": "Two App",
    "display_names": [
        "App Two",
        "Application Two"
    ],
    "platform": "ANDROID",
    "platform_app_id": "com.demo.app.two",
    "status": "DEVELOPMENT",
    "can_background_alert": true,
    "can_steal_focus": true,
    "tech_email": null,
    "tech_phone": null,
    "default_hmi_level": "HMI_NONE",
    "created_ts": "2017-06-12T13:30:32.912Z",
    "updated_ts": "2017-08-02T19:28:32.912Z",
    "countries": [
        {
            "id": 1,
            "iso": "AD",
            "name": "Andorra"
        },
        {
            "id": 2,
            "iso": "AE",
            "name": "United Arab Emirates"
        }
    ],
    "permissions": [
        {
            "id": 18,
            "key": "accPedalPosition",
            "name": "Accelerator Pedal Position",
            "hmi_level": "HMI_FULL",
            "is_parameter": true,
        },
        {
            "id": 20,
            "key": "driverBraking",
            "name": "Braking",
            "hmi_level": "HMI_BACKGROUND",
            "is_parameter": true
        }
    ],
    "category": {
        "id": 1,
        "name": "DEFAULT",
        "display_name": "Default"
    },
    "vendor": {
        "id": 1,
        "name": "Livio Web Team",
        "email": "admin@example.com"
    }
},
{
    "uuid": "ab9eec11-5fd1-4255-b4cd-769b529c88c4",
    "name": "idle_clicker",
    "display_names": [
        "Idle Clicker Android",
        "Idle Clicker"
    ],
    "platform": "ANDROID",
    "platform_app_id": "com.android.idle.clicker",
    "status": "PRODUCTION",
    "can_background_alert": true,
    "can_steal_focus": true,
    "tech_email": null,
    "tech_phone": null,
    "default_hmi_level": "HMI_NONE",
    "created_ts": "2017-06-12T13:34:33.514Z",
    "updated_ts": "2017-06-12T14:23:37.817Z",
    "countries": [
        {
            "id": 77,
            "iso": "GB",
            "name": "United Kingdom"
        },
        {
            "id": 233,
            "iso": "US",
            "name": "United States"
        }
    ],
    "permissions": [
        {
            "id": 25,
            "key": "airbagStatus",
            "name": "Airbag Status",
            "hmi_level": "HMI_BACKGROUND",
            "is_parameter": true
        }
    ],
    "category": {
        "id": 2,
        "name": "COMMUNICATION",
        "display_name": "Communication"
    },
    "vendor": {
        "id": 1,
        "name": "Livio Web Team",
        "email": "admin@example.com"
    }
}];