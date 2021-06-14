import Dexie from 'dexie';

export interface UserModel {
  id?: number; // make id optional because when create a data, typescript will still require this one XD
  name: string;
  email: string;
  companyId?: number;
  company?: CompanyModel;
}

export interface CompanyModel {
  id?: number;
  name: string;
}

export class MyDatabase extends Dexie {
  public users: Dexie.Table<UserModel, number> // id is number in this case
  public companies: Dexie.Table<CompanyModel, number> // id is number in this case

  public constructor() {
    super('MyDatabase');
    // @ts-ignore
    this.autoOpen = false;

    this.version(1).stores({
      users: '++id,name,email,address,companyId',
      companies: '++id,name',
    })

    this.users = this.table('users')
    this.companies = this.table('companies')
  }
}