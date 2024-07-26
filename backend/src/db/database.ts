import { connect } from 'mongoose';
import logger from '../../lib/logger';
import { FilterQuery } from 'mongoose';
import { Document } from 'mongoose';
import { Guild } from 'discord.js';
import { GuildData, GuildModel } from './guild.schema';
import { DBGuild } from '../common/types/dbGuild';

let instance: Database | undefined;
class Database {
    private constructor() { }
    public static init(): Promise<void> {
        const mongoUser = process.env['MONGO_USER'];
        const mongoPass = process.env['MONGO_PASS'];
        const mongoHost = process.env['MONGO_HOST'] ?? 'mongo';
        const mongoPort = process.env['MONGO_PORT'] ?? '27017';
        const mongoAuth = mongoUser && mongoPass ? `${mongoUser}:${mongoPass}@` : '';
        logger.info('Connecting to ' + `mongodb://${mongoAuth}${mongoHost}:${mongoPort}`);
        return connect(`mongodb://${mongoAuth}${mongoHost}:${mongoPort}`).then(() => {
            logger.info('Succuessfuly connected to MongoDB');
            instance = new Database();
        });
    }
    public static getInstance(): Promise<Database> {
        return new Promise<Database>((res) => {
            const interval = setInterval(() => {
                if (instance) {
                    clearInterval(interval);
                    res(instance);
                }
            }, 1000);
        });
    }

    public static async hasGuild(guildId: string): Promise<boolean> {
        return GuildModel.findById(guildId)
            .then((obj) => !!obj);
    }
    public static async getGuild(guild: Guild): Promise<Document<unknown, object, GuildData> & GuildData & Required<{ _id: string }>> {
        return GuildModel.findById(guild.id).then((obj) => {
            if (obj) {
                obj.lastActivityTimestamp = Date.now();
                obj.name = guild.name;
                return obj;
            } else {
                return new GuildModel({
                    _id: guild.id,
                    name: guild.name,
                    assistantRoleIDs: [],
                    editorRoleIDs: [],
                    voice: 'female',
                    lastActivityTimestamp: Date.now(),
                    raidHelper: {
                        events: []
                    }
                });
            }
        });
    }
    public static async deleteGuild(guildId: string): Promise<unknown> {
        return GuildModel.deleteOne({
            _id: guildId
        });
    }
    public static async getAllGuilds(): Promise<DBGuild[]> {
        return GuildModel.find({}).exec();
    }
    public static async queryGuilds(filter: FilterQuery<GuildData>): Promise<DBGuild[]> {
        return GuildModel.find(filter).exec();
    }
}

export default Database;