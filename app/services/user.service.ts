import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { Observable } from 'rxjs';
import 'rxjs/add/operator/map'

import { User } from '../models/index';
import {AuthHttp} from "../auth/auth-jwt";

@Injectable()
export class UserService {
    constructor(private http: AuthHttp) {}

    getUsers(): Observable<User[]> {
        // add authorization header with jwt token
        // let headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.token });
        // let options = new RequestOptions({ headers: headers });
        // console.log("authenticationService token:"+this.authenticationService.token)
        // console.log("localStorage token:"+localStorage.getItem('currentUser'))
        // get users from api
        return this.http.get('/api/v1/users')
            .map((response: Response) => response.json());
    }
}