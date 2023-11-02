export class User {
    static X_API_USERNAME = 'admin@localhost.com'
    static X_API_PASSWD = 'fAWnRBrDXhvM7J6u'


    constructor(
      public id: string,
      public email: string,
    ){}
  
    static getToken(): string|undefined {
      const idToken = document.cookie.split('; ').find(c => c.includes('idToken'))?.split('=') ?? []
      if(idToken.length != 2) return;
  
      return idToken[1];
    }
  
    static getUser(): User|undefined {
      const idToken = User.getToken()
  
      if(!idToken) return;
  
      const data: {'cognito:username': string; email: string} = JSON.parse(atob(idToken.split('.')[1]))
  
  
      return new User(data['cognito:username'], data['email'])
    }
}