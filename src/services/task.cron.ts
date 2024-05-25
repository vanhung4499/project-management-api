import {CronJob, cronJob} from '@loopback/cron';
import {repository} from '@loopback/repository';
import {TaskRepository} from '../repositories';

@cronJob()
export class TaskCronJob extends CronJob {
  constructor(
    @repository(TaskRepository)
    private taskRepository: TaskRepository,
  ) {
    super({
      name: 'cleanup-tasks-job',
      cronTime: '0 0 * * *', // Runs at 0h every day
      onTick: async () => {
        await this.cleanupTasks();
      },
      start: true,
    });
  }

  async cleanupTasks() {
    // delete all tasks with status 'done'
    await this.taskRepository.deleteAll({status: 'done'});
    console.log('Deleted all tasks with status "done"');
  }
}
