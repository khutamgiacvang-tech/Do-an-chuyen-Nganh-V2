const Manga = require("../models/Manga");
const Chapter = require("../models/Chapter");

exports.home = async (req, res) => {

    try {

        const mangas = await Manga.find({
    status: "approved"
})
.sort({ lastUpdated: -1 })
.limit(12)
.lean();

        for (const manga of mangas) {

            const latestChapter = await Chapter.findOne({
                manga: manga._id
            })
            .sort({ chapterNumber: -1 })
            .lean();

            manga.lastChapter =
                latestChapter?.chapterNumber || 0;

            manga.lastChapterDate =
                latestChapter?.createdAt || manga.createdAt;
        }

        const topWeek = await Manga.find({
            status: "approved"
        })
        .sort({ weeklyViews: -1 })
        .limit(9)
        .lean();

        const topMonth = await Manga.find({
            status: "approved"
        })
        .sort({ monthlyViews: -1 })
        .limit(9)
        .lean();

        const topAll = await Manga.find({
            status: "approved"
        })
        .sort({ views: -1 })
        .limit(9)
        .lean();

        const rankingLists = [topWeek, topMonth, topAll];

        for (const list of rankingLists) {

            for (const manga of list) {

                const latestChapter = await Chapter.findOne({
                    manga: manga._id
                })
                .sort({ chapterNumber: -1 })
                .lean();

                manga.lastChapter =
                    latestChapter?.chapterNumber || 0;

                manga.lastChapterDate =
                    latestChapter?.createdAt || manga.createdAt;
            }
        }

        res.render("home", {
            title: "MangaNest",
            mangas,
            topWeek,
            topMonth,
            topAll
        });

    } catch (err) {

        console.log(err);

        res.render("home", {
            title: "MangaNest",
            mangas: [],
            topWeek: [],
            topMonth: [],
            topAll: []
        });

    }

};