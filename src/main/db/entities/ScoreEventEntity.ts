import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'score_events' })
export class ScoreEventEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Index({ unique: true })
  @Column({ type: 'text' })
  uuid!: string

  @Column({ type: 'text' })
  student_name!: string

  @Column({ type: 'text' })
  reason_content!: string

  @Column({ type: 'integer' })
  delta!: number

  @Column({ type: 'integer' })
  val_prev!: number

  @Column({ type: 'integer' })
  val_curr!: number

  @Column({ type: 'text', default: () => 'CURRENT_TIMESTAMP' })
  event_time!: string

  @Index()
  @Column({ type: 'integer', nullable: true })
  settlement_id!: number | null
}
