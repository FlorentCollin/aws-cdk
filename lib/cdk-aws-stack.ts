import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
import {readFileSync} from "fs";
import * as path from "path";

export class CDKFlorentStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        
        const bucketName = "cf-florent-bucket"

        const lambda_role = new iam.CfnRole(this, "lambda-role-id", {
                assumeRolePolicyDocument: {
                    Version: "2012-10-17",
                    Statement: [{
                        Effect: iam.Effect.ALLOW,
                        Principal: {
                            Service: ["lambda.amazonaws.com"]
                        },
                        Action: ["sts:AssumeRole"]
                    }]
                },
                policies: [{
                    policyName: "lambda-policy",
                    policyDocument:
                        {
                            Version: "2012-10-17",
                            Statement: [
                                {
                                    Effect: iam.Effect.ALLOW,
                                    Action: [
                                        "logs:CreateLogGroup",
                                        "logs:CreateLogStream",
                                        "logs:PutLogEvents"
                                    ],
                                    Resource: 'arn:aws:logs:*:*:*'
                                },
                                {
                                    Effect: iam.Effect.ALLOW,
                                    Action: [
                                        "s3:GetObject"
                                    ],
                                    Resource: [
                                        `arn:aws:s3:::${bucketName}/*`,
                                        `arn:aws:s3:::${bucketName}`
                                    ]
                                }
                            ]
                        },
                }]
            });

        const simple_lambda = new lambda.CfnFunction(this, "cdk-florent-lambda-id", {
            handler: "index.main",
            role: lambda_role.attrArn,
            runtime: "python3.8",
            code: {
                zipFile: readFileSync(path.join(__dirname, "resources", "index.py"), {encoding: "utf-8"})
            }
        });

        const lambda_permission = new lambda.CfnPermission(this, "lambda-permission-id", {
            principal: "s3.amazonaws.com",
            action: "lambda:InvokeFunction",
            
            functionName: simple_lambda.attrArn,
        });

        const bucket = new s3.CfnBucket(this, "cdk-florent-bucket-id", {
            bucketName: bucketName,
            bucketEncryption: {
                serverSideEncryptionConfiguration: [{
                    serverSideEncryptionByDefault: {sseAlgorithm: "AES256"}
                }]
            },
            publicAccessBlockConfiguration: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
            notificationConfiguration: {
                lambdaConfigurations: [{
                    event: s3.EventType.OBJECT_CREATED,
                    function: simple_lambda.attrArn
                }]
            },
        });
    }
}