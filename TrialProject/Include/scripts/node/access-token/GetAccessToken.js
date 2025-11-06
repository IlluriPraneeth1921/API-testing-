//node GetAccessToken.js QC George.Parker Password123#

const { CognitoUserPool, AuthenticationDetails, CognitoUser } = require('amazon-cognito-identity-js');
 
// Configuration
const environmentConfig = {
    QC: {
        UserPoolId: 'us-east-1_3N5rue0JG',
        ClientId: '5kou2mugm19s58urfnpt4k30ts'
    },
    F2: {
        UserPoolId: 'us-east-1_3N5rue0JG',
        ClientId: '594gku1gpjc23mef154rionnr6'
    },
    F1: {
        UserPoolId: 'us-east-1_3N5rue0JG',
        ClientId: '7drslfu74fbrtjq55bbmgot99e'
    },
    F5: {
        UserPoolId: 'us-east-1_3N5rue0JG',
        ClientId: '3f60s5f2p1sl8n1ihdbham6j2n'
    },
    SANDBOX: {
        UserPoolId: 'us-east-1_fnCVc5EZ1',
        ClientId: '3jacebnb1786m7a8ps1p51ij8o'
    },
	DEV: {
        UserPoolId: 'us-east-1_3N5rue0JG',
        ClientId: '48l69o4o8rq1ur4mv2uq3mhfid'
    },
	MNSANDBOX: {
		UserPoolId: 'us-east-1_6sOaiEGSq',
        ClientId: '22ctqflqbgf04hn0jgeo7g4hie'
    },
	StdDevF1: {
		UserPoolId: 'us-east-1_LQoUI3SF6',
        ClientId: '4lksce1ciup1au5r92fv96ltja'
    },
	WidhsDevF1: {
		UserPoolId: 'us-east-1_EbcDrT7oC',
        ClientId: 'qa75hi44uaeqmacemabhp5mod'
    },
	WidhsF1: {
		UserPoolId: 'us-east-1_03crulq2G',
        ClientId: '6rvbc4ktp67kiul4d6mqr0big6'
    },
};

// Function to authenticate and obtain the access token
async function authenticateAndGetAccessToken(UserPoolId, ClientId, username, password) {
    // Create an AuthenticationDetails object
    const authenticationDetails = new AuthenticationDetails({
        Username: username,
        Password: password
    });

    // Create a User Pool object
    const userPool = new CognitoUserPool({
        UserPoolId: UserPoolId,
        ClientId: ClientId
    });
 
    return new Promise((resolve, reject) => {
        const cognitoUser = new CognitoUser({ Username: username, Pool: userPool });
 
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: session => resolve(session.getAccessToken().getJwtToken()),
            onFailure: err => reject(err)
        });
    });
}
 
// Parse command-line arguments
const args = process.argv.slice(2);
 
if (args.length !== 3) {
    console.error('Usage: node GetAccessToken.js <environment> <username> <password>');
    process.exit(1);
}
 
const [environment, username, password] = args;

// Get configuration for environment
const config = environmentConfig[environment.toUpperCase()];
if (!config) {
    console.error(`Error: Unknown environment '${environment}'. Available environments: ${Object.keys(environmentConfig).join(', ')}`);
    process.exit(1);
}

// Example usage of the function
(async () => {
    try {
        const accessToken = await authenticateAndGetAccessToken(config.UserPoolId, config.ClientId, username, password);
        console.log('Access Token:', accessToken);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();