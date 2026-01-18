import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'settlements' })
export class SettlementEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'text' })
  start_time!: string

  @Column({ type: 'text' })
  end_time!: string

  @Column({ type: 'text', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: string
}
