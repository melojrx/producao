from django.urls import path

from relatorios.viewsets.dashboard import DashboardViewSet

urlpatterns = [
    path("relatorios/dashboard/", DashboardViewSet.as_view({"get": "resumo"}), name="dashboard-resumo"),
    path("relatorios/dashboard/producao_diaria/", DashboardViewSet.as_view({"get": "producao_diaria"}), name="dashboard-producao-diaria"),
    path("relatorios/dashboard/indicadores_qualidade/", DashboardViewSet.as_view({"get": "indicadores_qualidade"}), name="dashboard-indicadores-qualidade"),
    path("relatorios/dashboard/<uuid:pk>/indicadores/", DashboardViewSet.as_view({"get": "indicadores_turno"}), name="dashboard-indicadores-turno"),
]