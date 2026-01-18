import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'reasons' })
export class ReasonEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Index({ unique: true })
  @Column({ type: 'text' })
  content!: string

  @Column({ type: 'text', default: '其他' })
  category!: string

  @Column({ type: 'integer' })
  delta!: number

  @Column({ type: 'integer', default: 0 })
  is_system!: number

  @Column({ type: 'text', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: string
}
