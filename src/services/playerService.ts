import axios from "axios";

export default {
    async getAll() {
        return await axios.get("/api/player/getAll");
    },
};
