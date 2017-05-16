// Import the core angular services.
import {ErrorHandler, Injector, ReflectiveInjector} from "@angular/core";
import { forwardRef } from "@angular/core";
import { Inject } from "@angular/core";
import { Injectable } from "@angular/core";
import { Response } from "@angular/http";

// Import the application components and services.
import { ErrorLogService } from "./errorlog.service";
import {Router} from "@angular/router";
import {AuthService} from "../auth/auth.service";

export interface GlobalErrorHandlerOptions {
    rethrowError: boolean;
    unwrapError: boolean;
}

export var GLOBAL_ERROR_HANDLER_OPTIONS: GlobalErrorHandlerOptions = {
    rethrowError: false,
    unwrapError: false
};


@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

    private errorLogService: ErrorLogService;
    private options: GlobalErrorHandlerOptions;
    private authService: AuthService;
    private router: Router;

// --
// CAUTION: The core implementation of the ErrorHandler class accepts a boolean
// parameter, `rethrowError`; however, this is not part of the interface for the
// class. In our version, we are supporting that same concept; but, we are doing it
// through an Options object (which is being defaulted in the providers).

    constructor(injector: Injector,
        @Inject( GLOBAL_ERROR_HANDLER_OPTIONS ) options: GlobalErrorHandlerOptions) {
        this.options = options;
        this.errorLogService = injector.get(ErrorLogService);
        this.authService = injector.get(AuthService);
        this.router = injector.get(Router);
    }


// ---
// PUBLIC METHODS.
// ---


// Handle the given error.
    public handleError( error: Response | any ) : void {

// Log to the console.
        try {
            console.group( "ErrorHandler" );
            console.error( error.message );
            console.error( error.stack );
            console.groupEnd();
        } catch ( handlingError ) {
            console.group( "ErrorHandler" );
            console.warn( "Error when trying to output error." );
            console.error( handlingError );
            console.groupEnd();
        }

// Send to the error-logging service.
        try {
            this.options.unwrapError
                ? this.errorLogService.logError( this.findOriginalError( error ) )
                : this.errorLogService.logError( error )
            ;
        } catch ( loggingError ) {
            console.group( "ErrorHandler" );
            console.warn( "Error when trying to log error to", this.errorLogService );
            console.error( loggingError );
            console.groupEnd();
        }

        if ((error instanceof Response) && this.isUnauthorized(error.status)) {
            //logout the user or do what you want
            this.navigateLogin();
            // let errMsg: string;
            // if (error instanceof Response) {
            //     const body = error.json() || '';
            //     const err = body.error || JSON.stringify(body);
            //     errMsg = `${error.status} - ${error.statusText || ''} ${err}`;
            // } else {
            //     errMsg = error.message ? error.message : error.toString();
            // }
        }

        if ( this.options.rethrowError ) {
            throw( error );
        }
    }

// ---
// PRIVATE METHODS.
// ---

    private navigateLogin() {
        // not logged in so redirect to login page
        this.authService.logout();
        this.router.navigate(['/login']);
    }

// Attempt to find the underlying error in the given Wrapped error.
    private findOriginalError( error: any ) : any {
        while ( error && error.originalError ) {
            error = error.originalError;
        }
        return( error );
    }

    private isUnauthorized(status: number): boolean {
        return status === 0 || status === 401 || status === 403;
    }
}

// The collection of providers used for this service at the module level.
// Notice that we are overriding the CORE ErrorHandler with our own class definition.
// --
// CAUTION: These are at the BOTTOM of the file so that we don't have to worry about
// creating futureRef() and hoisting behavior.

export var GLOBAL_ERROR_HANDLER_PROVIDERS = [
    {
        provide: GLOBAL_ERROR_HANDLER_OPTIONS,
        useValue: GLOBAL_ERROR_HANDLER_OPTIONS
    },
    {
        provide: ErrorHandler,
        useClass: GlobalErrorHandler
    }
];