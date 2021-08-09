import * as cdk from '@aws-cdk/core';
import * as appsync from '@aws-cdk/aws-appsync';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as path from "path";

export class CDKFlorentStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const api = new appsync.GraphqlApi(this, 'Api', {
            name: "cdk-florent-api",
            schema: appsync.Schema.fromAsset('schemas/schema.graphql'),
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: appsync.AuthorizationType.API_KEY,
                    apiKeyConfig: {
                        expires: cdk.Expiration.after(cdk.Duration.days(365))
                    }
                }
            },
            xrayEnabled: true,
        });
        
        new cdk.CfnOutput(this, "GraphQLAPIURL", {
            value: api.graphqlUrl
        });
        
        new cdk.CfnOutput(this, "GraphQLAPIKey", {
            value: api.apiKey || ''
        });

        new cdk.CfnOutput(this, "Stack Region", {
            value: this.region
        });
        
        
        const notesLambda = new lambda.Function(this, "AppSyncNotesHandler", {
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'main.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, 'resources')),
            memorySize: 1024
        });
        
        const lambdaDataSource = api.addLambdaDataSource('lambdaDataSource', notesLambda);
        
        
        const resolvers = [
            ["Query",    "getNoteById"],
            ["Query",    "listNotes"],
            ["Mutation", "createNote"],
            ["Mutation",  "updateNote"],
        ]
        
        for (let [typeName, fieldName] of resolvers) {
           lambdaDataSource.createResolver({typeName, fieldName}) 
        }
        
        const notesTable = new ddb.Table(this, 'CDKNotesTableFlorent', {
            billingMode: ddb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
               name: 'id',
               type: ddb.AttributeType.STRING, 
            },
        });
        
        notesTable.grantFullAccess(notesLambda);
        
        notesLambda.addEnvironment('NOTES_TABLE', notesTable.tableName);
    }
}
