import {AuthenticationComponent} from '@loopback/authentication';
import {
  JWTAuthenticationComponent,
  SecuritySpecEnhancer,
  TokenServiceBindings,
  UserRepository,
} from '@loopback/authentication-jwt';
import {
  AuthorizationComponent,
  AuthorizationTags,
} from '@loopback/authorization';
import {BootMixin} from '@loopback/boot';
import {ApplicationConfig, createBindingFromClass} from '@loopback/core';
import {CronComponent} from '@loopback/cron';
import {RepositoryMixin, SchemaMigrationOptions} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import crypto from 'crypto';
import path from 'path';
import {PasswordHasherBindings, UserServiceBindings} from './keys';
import {ErrorHandlerMiddlewareProvider} from './middlewares';
import {UserCredentialsRepository} from './repositories';
import {MySequence} from './sequence';
import {
  BcryptHasher,
  JWTService,
  MyAuthorizerProvider,
  UserManagementService,
} from './services';
import {TaskCronJob} from './services/task.cron';

export {ApplicationConfig};

export class ProjectManagementApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Bind authentication component related elements
    this.component(AuthenticationComponent);
    this.component(JWTAuthenticationComponent);
    this.component(AuthorizationComponent);

    // Bind cron job component
    this.component(CronComponent);

    this.setUpBindings();

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }

  setUpBindings(): void {
    // Bind bcrypt hash services
    this.bind(PasswordHasherBindings.ROUNDS).to(10);
    this.bind(PasswordHasherBindings.PASSWORD_HASHER).toClass(BcryptHasher);
    this.bind(TokenServiceBindings.TOKEN_SERVICE).toClass(JWTService);

    this.bind(UserServiceBindings.USER_SERVICE).toClass(UserManagementService);
    this.add(createBindingFromClass(SecuritySpecEnhancer));

    // Bind cron job
    this.add(createBindingFromClass(TaskCronJob));

    this.add(createBindingFromClass(ErrorHandlerMiddlewareProvider));

    this.bind('authorizationProviders.my-authorizer-provider')
      .toProvider(MyAuthorizerProvider)
      .tag(AuthorizationTags.AUTHORIZER);

    // Use JWT secret from JWT_SECRET environment variable if set
    // otherwise create a random string of 64 hex digits
    const secret =
      process.env.JWT_SECRET ?? crypto.randomBytes(32).toString('hex');
    this.bind(TokenServiceBindings.TOKEN_SECRET).to(secret);

    // Use JWT expire time from JWT_EXPIRES_IN environment variable if set
    const expireTime = process.env.JWT_EXPIRES_IN ?? '604800'; // 7 * 24 * 60 * 60;
    this.bind(TokenServiceBindings.TOKEN_EXPIRES_IN).to(expireTime);
  }

  async migrateSchema(options?: SchemaMigrationOptions) {
    // 1. Run migration scripts provided by connectors
    await super.migrateSchema(options);

    // 2. Make further changes. When creating predefined model instances,
    const userRepo = await this.getRepository(UserRepository);
    const userCredentialsRepo = await this.getRepository(
      UserCredentialsRepository,
    );

    // Create the default admin, user
    const users = [
      {email: 'admin@example.com', password: '12345678', username: 'admin'},
      {email: 'user@example.com', password: '12345678', username: 'user'},
      {email: 'dev@example.com', password: '12345678', username: 'dev'},
      {email: 'test@example.com', password: '12345678', username: 'test'},
    ];

    for (const user of users) {
      const foundUser = await userRepo.findOne({where: {email: user.email}});

      if (foundUser) continue;

      const newUser = await userRepo.create(user);

      await userCredentialsRepo.create({
        password: user.password,
        userId: newUser.id,
      });
    }
  }
}
