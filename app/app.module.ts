import {ErrorHandler, NgModule}      from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';
import { HttpModule }    from '@angular/http';

// used to create fake backend
import { fakeBackendProvider} from './helpers/index';
import { GlobalErrorHandler, ErrorLogService } from './error/index';
import { MockBackend, MockConnection } from '@angular/http/testing';
import { BaseRequestOptions } from '@angular/http';

import { AppComponent }  from './app.component';
import { routing }        from './app.routing';

import { AuthGuard } from './auth/index';

import { LoginComponent } from './login/index';
import { HomeComponent } from './home/index';
import {AuthModule} from "./auth/auth.module";
import {UserService} from "./services/user.service";
import {GLOBAL_ERROR_HANDLER_OPTIONS, GLOBAL_ERROR_HANDLER_PROVIDERS} from "./error/GlobalErrorHandler";

@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        HttpModule,
        AuthModule,
        routing
    ],
    declarations: [
        AppComponent,
        LoginComponent,
        HomeComponent
    ],
    providers: [

        ErrorLogService,
        GLOBAL_ERROR_HANDLER_PROVIDERS,
        {provide: GLOBAL_ERROR_HANDLER_OPTIONS, useValue: {rethrowError: false, unwrapError: false}},
        UserService

        // providers used to create fake backend
        //fakeBackendProvider,
        //MockBackend,
        //BaseRequestOptions
    ],
    bootstrap: [AppComponent]
})

export class AppModule { }