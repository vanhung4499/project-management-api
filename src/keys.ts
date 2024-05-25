import {UserService} from '@loopback/authentication';
import {Authorizer} from '@loopback/authorization';
import {BindingKey} from '@loopback/context';
import {User} from './models';
import {Credentials} from './repositories';
import {PasswordHasher} from './services';

export namespace PasswordHasherBindings {
  export const PASSWORD_HASHER =
    BindingKey.create<PasswordHasher>('services.hasher');
  export const ROUNDS = BindingKey.create<number>('services.hasher.round');
}

export namespace UserServiceBindings {
  export const USER_SERVICE = BindingKey.create<UserService<User, Credentials>>(
    'services.user.service',
  );
}

export namespace ProjectAuthorizeProviderBindings {
  export const PROJECT_AUTHORIZER_PROVIDER = BindingKey.create<Authorizer>(
    'authorizationProviders.projectProvider',
  );
}
