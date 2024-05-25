import {
  authenticate,
  TokenService,
  UserService,
} from '@loopback/authentication';
import {
  Credentials,
  TokenServiceBindings,
  UserServiceBindings,
} from '@loopback/authentication-jwt';
import {authorize} from '@loopback/authorization';
import {inject} from '@loopback/core';
import {Filter, FilterExcludingWhere, repository} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import _ from 'lodash';
import {PasswordHasherBindings} from '../keys';
import {User, UserWithPassword} from '../models';
import {UserRepository} from '../repositories';
import {
  basicAuthorization,
  PasswordHasher,
  UserManagementService,
  validateCredentials,
} from '../services';
import {
  CredentialsRequestBody,
  UserProfileSchema,
} from './specs/user-controller.specs';

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: UserService<User, Credentials>,
    @inject(UserServiceBindings.USER_SERVICE)
    public userManagementService: UserManagementService,
  ) {}

  @post('/users/register')
  @response(200, {
    description: 'User model instance',
    content: {'application/json': {schema: getModelSchemaRef(User)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(UserWithPassword, {
            title: 'NewUser',
            exclude: ['id', 'role'],
          }),
        },
      },
    })
    newUser: UserWithPassword,
  ): Promise<User> {
    // default role is set to 'user'
    newUser.role = 'user';

    // valid email and password are required
    validateCredentials(_.pick(newUser, ['email', 'password']));

    let foundUser = await this.userRepository.findOne({
      where: {username: newUser.username},
    });

    if (foundUser) {
      throw new HttpErrors.BadRequest(
        `Username ${newUser.username} is already taken.`,
      );
    }

    foundUser = await this.userRepository.findOne({
      where: {email: newUser.email},
    });

    if (foundUser) {
      throw new HttpErrors.BadRequest(
        `Email ${newUser.email} is already taken.`,
      );
    }

    return await this.userManagementService.createUser(newUser);
  }

  @get('/users')
  @authenticate('jwt')
  @authorize({
    allowedRoles: ['admin'],
    voters: [basicAuthorization],
  })
  @response(200, {
    description: 'Array of User model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(User, {includeRelations: true}),
        },
      },
    },
  })
  async find(@param.filter(User) filter?: Filter<User>): Promise<User[]> {
    return this.userRepository.find(filter);
  }

  @get('/users/{id}')
  @authenticate('jwt')
  @response(200, {
    description: 'User model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(User, {includeRelations: true}),
      },
    },
  })
  async findById(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.path.string('id') id: string,
    @param.filter(User, {exclude: 'where'}) filter?: FilterExcludingWhere<User>,
  ): Promise<User> {
    const {userId} = currentUserProfile;

    return this.userRepository.findById(id, filter);
  }

  @patch('/users/{id}')
  @authorize({
    allowedRoles: ['admin'],
    voters: [basicAuthorization],
  })
  @response(204, {
    description: 'User PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {partial: true}),
        },
      },
    })
    user: User,
  ): Promise<void> {
    await this.userRepository.updateById(id, user);
  }

  @patch('users/me')
  @authenticate('jwt')
  @response(204, {
    description: 'Update my user profile',
  })
  async updateMe(
    @inject(SecurityBindings.USER)
    currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {partial: true}),
        },
      },
    })
    user: Omit<User, 'id' | 'role'>,
  ): Promise<void> {
    const userId = currentUser.id;

    const foundUser = await this.userRepository.findById(userId);
    if (!foundUser) {
      throw new HttpErrors.NotFound(`User not found.`);
    }

    if (user.email) {
      throw new HttpErrors.BadRequest(`Email cannot be changed.`);
    }

    if (user.role) {
      throw new HttpErrors.BadRequest(`Role cannot be changed.`);
    }

    user = {...foundUser, ...user};

    await this.userRepository.updateById(user.id, user);
  }

  @post('/users/login')
  @response(200, {
    description: 'Token',
    content: {
      'application/json': {
        schema: {type: 'object', properties: {token: {type: 'string'}}},
      },
    },
  })
  async login(
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<{token: string}> {
    // ensure the user exists, and the password is correct
    const user = await this.userService.verifyCredentials(credentials);

    // convert a User object into a UserProfile object (reduced set of properties)
    const userProfile = this.userService.convertToUserProfile(user);

    // create a JSON Web Token based on the user profile
    const token = await this.jwtService.generateToken(userProfile);

    return {token};
  }

  @get('/users/me')
  @authenticate('jwt')
  @response(200, {
    description: 'The current user profile',
    content: {
      'application/json': {
        schema: UserProfileSchema,
      },
    },
  })
  async printCurrentUser(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<UserProfile> {
    return currentUser;
  }

  @del('/users/{id}')
  @authenticate('jwt')
  @authorize({
    allowedRoles: ['admin'],
    voters: [basicAuthorization],
  })
  @response(204, {
    description: 'User DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.userRepository.deleteById(id);
  }
}
