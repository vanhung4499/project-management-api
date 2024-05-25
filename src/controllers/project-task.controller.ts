import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {Project, Task} from '../models';
import {ProjectMemberRepository, ProjectRepository} from '../repositories';

export class ProjectTaskController {
  constructor(
    @repository(ProjectRepository)
    protected projectRepository: ProjectRepository,
    @repository(ProjectMemberRepository)
    protected projectMemberRepository: ProjectMemberRepository,
  ) {}

  @get('/projects/{id}/tasks')
  @authenticate('jwt')
  @authorize({resource: 'project', scopes: ['task']})
  @response(200, {
    description: 'Array of Project has many Task',
    content: {
      'application/json': {
        schema: {type: 'array', items: getModelSchemaRef(Task)},
      },
    },
  })
  async find(
    @inject(SecurityBindings.USER)
    currentUser: UserProfile,
    @param.path.string('id') id: string,
    @param.query.object('filter') filter?: Filter<Task>,
  ): Promise<Task[]> {
    // Check if the current user is an admin of the project
    const userId = currentUser.id;
    const isAdminOrOwner = await this.projectMemberRepository.checkAdmin(
      userId,
      id,
    );

    // If the user is not an admin, only return public tasks
    if (!isAdminOrOwner) {
      filter = {...filter, where: {type: 'public'}};
    }

    return this.projectRepository.tasks(id).find(filter);
  }

  @post('/projects/{id}/tasks')
  @authenticate('jwt')
  @authorize({resource: 'project', scopes: ['task']})
  @response(200, {
    description: 'Project model instance',
    content: {'application/json': {schema: getModelSchemaRef(Task)}},
  })
  async create(
    @param.path.string('id') id: typeof Project.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Task, {
            title: 'NewTaskInProject',
            exclude: ['id'],
            optional: ['projectId'],
          }),
        },
      },
    })
    task: Omit<Task, 'id'>,
  ): Promise<Task> {
    return this.projectRepository.tasks(id).create(task);
  }

  @patch('/projects/{id}/tasks')
  @authenticate('jwt')
  @authorize({resource: 'project', scopes: ['task']})
  @response(200, {
    description: 'Project.Task PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async patch(
    @inject(SecurityBindings.USER)
    currentUser: UserProfile,
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Task, {partial: true}),
        },
      },
    })
    task: Partial<Task>,
    @param.query.object('where', getWhereSchemaFor(Task)) where?: Where<Task>,
  ): Promise<Count> {
    const userId = currentUser.id;
    const isAdmin = await this.projectMemberRepository.checkAdmin(userId, id);
    // If the user is not an admin, only allow deleting public tasks
    if (!isAdmin) {
      where = {...where, type: 'public'};
    }

    return this.projectRepository.tasks(id).patch(task, where);
  }

  @del('/projects/{id}/tasks')
  @authenticate('jwt')
  @authorize({resource: 'project', scopes: ['task']})
  @response(200, {
    description: 'Project.Task DELETE success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async delete(
    @inject(SecurityBindings.USER)
    currentUser: UserProfile,
    @param.path.string('id') id: string,
    @param.query.object('where', getWhereSchemaFor(Task)) where?: Where<Task>,
  ): Promise<Count> {
    const userId = currentUser.id;
    const isAdmin = await this.projectMemberRepository.checkAdmin(userId, id);
    // If the user is not an admin, only allow deleting public tasks
    if (!isAdmin) {
      where = {...where, type: 'public'};
    }

    return this.projectRepository.tasks(id).delete(where);
  }
}
