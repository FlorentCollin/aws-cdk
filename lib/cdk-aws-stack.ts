import * as cdk from '@aws-cdk/core';
import * as appsync from '@aws-cdk/aws-appsync';
import * as ddb from '@aws-cdk/aws-dynamodb';
import {AttributeType} from '@aws-cdk/aws-dynamodb';

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
        
        const notesTable = new ddb.Table(this, 'CDKNotesTableFlorent', {
            billingMode: ddb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
               name: 'id',
               type: ddb.AttributeType.STRING, 
            },
        });
        
        notesTable.addGlobalSecondaryIndex({
            indexName: "userId",
            partitionKey: {
               type: AttributeType.STRING, 
               name: "userId"
            }
        });
        
        const notesDataSource = api.addDynamoDbDataSource("DDBNotesFlorentDataSource", notesTable);
        
        notesDataSource.createResolver({
            typeName: "Query",
            fieldName: "listNotes",
            requestMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/listNotesRequest.vtl"),
            responseMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/simpleItemResponse.vtl"),
        });
        
        
        notesDataSource.createResolver({
            typeName: "Mutation",
            fieldName: "createNote",
            requestMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/createNoteRequest.vtl"),
            responseMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/simpleItemResponse.vtl"),
        });
        
        notesDataSource.createResolver({
            typeName: "Mutation",
            fieldName: "deleteNote",
            requestMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/deleteNoteRequest.vtl"),
            responseMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/simpleItemResponse.vtl"),
        });
        
        const usersTable = new ddb.Table(this, 'CDKUsersTableFlorent', {
            billingMode: ddb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING,
            },
        });
        
        const usersDataSource = api.addDynamoDbDataSource("DDBUsersFlorentDataSource", usersTable);
        usersTable.grantFullAccess(usersDataSource);
        usersTable.grantFullAccess(notesDataSource);
        notesTable.grantFullAccess(usersDataSource);
        notesTable.grantFullAccess(notesDataSource);

        usersDataSource.createResolver({
            typeName: "Mutation",
            fieldName: "createUser",
            requestMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/createUserRequest.vtl"),
            responseMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/simpleItemResponse.vtl"),
        });
        
        usersDataSource.createResolver({
            typeName: "Mutation",
            fieldName: "deleteUser",
            requestMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/deleteUserRequest.vtl"),
            responseMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/simpleItemResponse.vtl"),
        });
        
        usersDataSource.createResolver({
            typeName: "Query",
            fieldName: "listUsers",
            requestMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/listUsersRequest.vtl"),
            responseMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/listUsersResponse.vtl"),
        });
        
        notesDataSource.createResolver({
            typeName: "User",
            fieldName: "notes",
            requestMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/userNotesRequest.vtl"),
            responseMappingTemplate: appsync.MappingTemplate.fromFile("resolvers/simpleItemResponse.vtl"),
        })
    }
}
