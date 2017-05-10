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
        return this.http.get('/api/v1/users')
            .map((response: Response) => response.json());
    }
}