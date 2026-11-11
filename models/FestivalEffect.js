import mongoose from "mongoose";

const FestivalEffectSchema = new mongoose.Schema(
    {
        festival: {
            type: String,
            required: true,
            trim: true,
        },

        effect: {
            type: String,
            required: true,
            enum: ["fireworks", "snowfall"],
        },

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

FestivalEffectSchema.pre("validate", function (next) {
    if (
        this.startDate &&
        this.endDate &&
        this.startDate >= this.endDate
    ) {
        this.invalidate(
            "endDate",
            "End date must be after start date."
        );
    }

    next();
});

export default mongoose.models.FestivalEffect ||
    mongoose.model("FestivalEffect", FestivalEffectSchema);