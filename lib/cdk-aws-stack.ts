import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';
import { S3EventSource } from '@aws-cdk/aws-lambda-event-sources';
import * as path from 'path';

export class CDKFlorentStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "cdk-florent-bucket-id", {
        encryption: s3.BucketEncryption.S3_MANAGED,
    });

    const simple_lambda = new lambda.Function(this, 'cdk-florent-lambda', {
        code: lambda.Code.fromAsset(path.join(__dirname, 'resources')),
        handler: "index.main",
        runtime: lambda.Runtime.PYTHON_3_8,
    });
    bucket.grantRead(simple_lambda);
    
    simple_lambda.addEventSource(new S3EventSource(bucket, {
        events: [ s3.EventType.OBJECT_CREATED ],
    }));
  }
}
