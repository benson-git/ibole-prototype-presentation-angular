import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { Observable } from 'rxjs';
import 'rxjs/add/operator/map'

import { AuthenticationService } from './index';
import { User } from '../models/index';

@Injectable()
export class UserService {
    constructor(
        private http: Http,
        private authenticationService: AuthenticationService) {
    }

    getUsers(): Observable<User[]> {
        // add authorization header with jwt token
        let headers = new Headers({ 'Authorization': 'Bearer ' + this.authenticationService.token });
        let options = new RequestOptions({ headers: headers });
        console.log("authenticationService token:"+this.authenticationService.token)
        console.log("localStorage token:"+localStorage.getItem('currentUser'))
        // get users from api
        return this.http.get('/api/v1/users', options)
            .map((response: Response) => response.json());
    }
}