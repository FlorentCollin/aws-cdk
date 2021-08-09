const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();

type Note = {
    id: string,
    name: string,
    completed: boolean,
};

type AppSyncEvent = {
    info: {
        fieldName: string
    },
    arguments: {
        noteId: string,
        note: Note,
    }
};

async function getNoteById(noteId: string) {
    const params = {
        TableName: process.env.NOTES_TABLE,
        Key: { id: noteId }
    };
    
    try {
        const { Item } = await docClient.get(params).promise();
        return Item;
    } catch (err) {
        console.log('DynamoDB error: ', err)
    }
}

async function createNote(note: Note) {
    const params = {
        TableName: process.env.NOTES_TABLE,
        Item: note
    };

    try {
        await docClient.put(params).promise();
        console.log("CreateNote: Note: ", note);
        return note;
    } catch (err) {
        console.log('DynamoDB error: ', err);
        return null;
    }
}

async function listNotes() {
    const params = {
        TableName: process.env.NOTES_TABLE,
    };
    
    try {
        const data = await docClient.scan(params).promise();
        return data.Items;
    } catch (err) {
        console.log('DynamoDB error: ', err);
        return null;
    }
}

type Params = {
  TableName: string | undefined,
  Key: string | {},
  ExpressionAttributeValues: any,
  ExpressionAttributeNames: any,
  UpdateExpression: string,
  ReturnValues: string
}

async function updateNote(note: any) {
    let params: Params = {
        TableName: process.env.NOTES_TABLE,
        Key: { id: note.id },
        ExpressionAttributeValues: {},
        ExpressionAttributeNames: {},
        UpdateExpression: "",
        ReturnValues: "UPDATED_NEW"
    };
    
    let prefix = "set ";
    let attributes = Object.keys(note);
    for (let attribute of attributes) {
        if (attribute !== "id") {
            params["UpdateExpression"] += prefix + "#" + attribute + " = :" + attribute;
            params.ExpressionAttributeValues[":" + attribute] = note[attribute];
            params["ExpressionAttributeNames"]["#" + attribute] = attribute;
            prefix = ", ";
        }
    }
    console.log("params: ", params);
    try {
        await docClient.update(params).promise();
        return note;
    } catch (err) {
        console.log("DynamoDB error: ", err);
        return null;
    }
 }
 
 async function deleteNote(noteId: string) {
    const params = {
        TableName: process.env.NOTES_TABLE,
        Key: {
          id: noteId
        }
    };
    try {
        await docClient.delete(params).promise();
        return noteId;
    } catch (err) {
        console.log('DynamoDB error: ', err)
        return null;
    }
}

exports.handler = async(event: AppSyncEvent) => {
    console.log("AppSyncEventLambda: ", event);
    switch (event.info.fieldName) {
        case "getNoteById":
            return await getNoteById(event.arguments.noteId);
        case "createNote":
            return await createNote(event.arguments.note);
        case "listNotes":
            return await listNotes();
        case "deleteNote":
            return await deleteNote(event.arguments.noteId);
        case "updateNote":
            return await updateNote(event.arguments.note);
    }
    return null;
}