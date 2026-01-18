import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'students' })
export class StudentEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'text' })
  name!: string

  @Column({ type: 'integer', default: 0 })
  score!: number

  @Column({ type: 'text', nullable: true })
  extra_json!: string | null

  @Column({ type: 'text', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: string

  @Column({ type: 'text', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: string
}
