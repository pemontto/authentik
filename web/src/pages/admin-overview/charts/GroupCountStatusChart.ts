import { ChartOptions, ChartData } from "chart.js";

import { t } from "@lingui/macro";

import { customElement } from "lit/decorators";

import { CoreApi } from "@goauthentik/api";

import { DEFAULT_CONFIG } from "../../../api/Config";
import { AKChart } from "../../../elements/charts/Chart";

interface GroupMetrics {
    count: number;
    superusers: number;
}

@customElement("ak-admin-status-chart-group-count")
export class GroupCountStatusChart extends AKChart<GroupMetrics> {
    getChartType(): string {
        return "doughnut";
    }

    getOptions(): ChartOptions {
        return {
            plugins: {
                legend: {
                    display: false,
                },
            },
            maintainAspectRatio: false,
        };
    }

    async apiRequest(): Promise<GroupMetrics> {
        const api = new CoreApi(DEFAULT_CONFIG);
        const count = (
            await api.coreGroupsList({
                pageSize: 1,
            })
        ).pagination.count;
        const superusers = (
            await api.coreGroupsList({
                isSuperuser: true,
            })
        ).pagination.count;
        this.centerText = count.toString();
        return {
            count: count - superusers,
            superusers,
        };
    }

    getChartData(data: GroupMetrics): ChartData {
        return {
            labels: [t`Total groups`, t`Superuser-groups`],
            datasets: [
                {
                    backgroundColor: ["#2b9af3", "#3e8635"],
                    spanGaps: true,
                    data: [data.count, data.superusers],
                },
            ],
        };
    }
}
