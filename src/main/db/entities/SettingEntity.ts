import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity({ name: 'settings' })
export class SettingEntity {
  @PrimaryColumn({ type: 'text' })
  key!: string

  @Column({ type: 'text', nullable: true })
  value!: string | null
}
